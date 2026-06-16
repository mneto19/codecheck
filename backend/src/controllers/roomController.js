// src/controllers/roomController.js

const prisma = require("../prisma/client");
const { generateRoomCode } = require("../utils/roomCode");
const { getIO } = require("../services/socketService");
const { compareCodeBatch } = require("../services/aiService");
const { executeCode } = require("../services/codeExecutionService");
const { isTestSupported, gradeAgainstCases } = require("../services/testRunnerService");

async function analyzeRoomSubmissions(roomId) {
  let submissions = await prisma.submission.findMany({
    where: { question: { roomId } },
    include: { student: true, question: true },
  });

  if (submissions.length === 0) return;

  // Aguardar que todas as execuções do workerQueue terminem antes de analisar
  const submissionIds = submissions.map((s) => s.id);
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const pending = await prisma.submission.count({
      where: { id: { in: submissionIds }, executionStatus: { in: ["Pending", "Queued"] } },
    });
    if (pending === 0) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  // Re-fetch com executionOutput atualizado após execuções terminarem
  submissions = await prisma.submission.findMany({
    where: { question: { roomId } },
    include: { student: true, question: true },
  });

  const io = getIO();

  const questionsSeen = new Map();
  for (const s of submissions) {
    if (questionsSeen.has(s.questionId)) continue;
    questionsSeen.set(s.questionId, s.question);
    if (!s.question.referenceOutput) {
      try {
        const refResult = await executeCode(s.question.referenceCode, s.question.language);
        const refOutput = refResult.stdout || refResult.stderr || "(sem output)";
        await prisma.question.update({
          where: { id: s.questionId },
          data: { referenceOutput: refOutput },
        });
        s.question.referenceOutput = refOutput;
      } catch (e) {
        console.error(`Execução de referência falhou para pergunta ${s.questionId}:`, e.message);
        const fallback = "(erro ao executar referência)";
        await prisma.question.update({
          where: { id: s.questionId },
          data: { referenceOutput: fallback },
        }).catch(() => {});
        s.question.referenceOutput = fallback;
      }
    }
  }

  // Propagar referenceOutput a todos os submissions da mesma pergunta
  for (const s of submissions) {
    const seen = questionsSeen.get(s.questionId);
    if (seen?.referenceOutput) s.question.referenceOutput = seen.referenceOutput;
  }

  // ---- Correção por testes (executada ANTES da análise da IA) ----
  // Corre a função de cada aluno com inputs controlados e compara com o esperado
  // (calculado a partir da referência). É o sinal FIÁVEL de correção funcional —
  // ao contrário de comparar o stdout em bruto, que é enganador porque o aluno
  // escreve os seus próprios prints de demonstração (valores de exemplo diferentes).
  const testBySubmission = new Map();
  await Promise.all(
    submissions.map(async (sub) => {
      const q = sub.question;
      const cases = Array.isArray(q.testCases) ? q.testCases : null;
      if (cases?.length && q.functionName && isTestSupported(q.language)) {
        try {
          const graded = await gradeAgainstCases(sub.studentCode, q.language, q.functionName, cases);
          if (graded) testBySubmission.set(sub.id, graded);
        } catch (e) {
          console.error(`Correção por testes falhou para submissão ${sub.id}:`, e.message);
        }
      }
    })
  );

  // Resumo da verificação por testes — enviado à IA como sinal de correção.
  function testSummary(sub) {
    const graded = testBySubmission.get(sub.id);
    if (graded) return `${graded.passed}/${graded.total} testes automáticos passaram`;
    if (sub.executionError) return "o código rebentou ao executar (erro de runtime)";
    return "sem testes automáticos disponíveis";
  }

  let results;
  try {
    results = await compareCodeBatch(
      submissions.map((s) => ({
        id: s.id,
        language: s.question.language,
        promptText: s.question.promptText,
        referenceCode: s.question.referenceCode,
        referenceOutput: s.question.referenceOutput || "",
        studentCode: s.studentCode,
        executionOutput: s.executionOutput || "",
        executionError: s.executionError || "",
        testSummary: testSummary(s),
      }))
    );
  } catch (e) {
    console.error("Análise IA falhou:", e.message);
    results = submissions.map((s) => ({
      id: s.id,
      correctness_score: null,
      logic_differences: [],
      style_notes: [],
      summary: "Análise IA indisponível.",
    }));
  }

  // Cap determinístico: os testes mandam. Quando todos passam não há cap (a nota da
  // IA fica intacta); quando falham alguns, limita proporcionalmente. Sem testes,
  // só limita se o código rebentou mesmo ao executar.
  results = results.map((ai) => {
    const sub = submissions.find((s) => s.id === ai.id);
    if (!sub) return ai;

    const graded = testBySubmission.get(sub.id);
    const testResults = graded ? { tests_passed: graded.passed, tests_total: graded.total } : null;

    if (ai.correctness_score === null) return { ...ai, ...testResults };

    let score = ai.correctness_score;
    if (graded && graded.total > 0) {
      const testCap = Math.round((graded.passed / graded.total) * 100);
      score = Math.min(score, testCap);
    } else if (sub.executionError) {
      score = Math.min(score, 25);
    }
    return { ...ai, correctness_score: score, ...testResults };
  });

  // Guarda na DB e notifica professor
  await Promise.all(
    results.map(async (ai) => {
      const sub = submissions.find((s) => s.id === ai.id);
      if (!sub) return;

      await prisma.submission.update({
        where: { id: sub.id },
        data: {
          aiCorrectnessScore: ai.correctness_score,
          aiLogicDifferences: ai.logic_differences,
          aiStyleNotes: ai.style_notes,
          aiSummary: ai.summary,
          aiGeneratedByAi: ai.gerado_por_ia ?? false,
          aiCertaintyDegree: ai.grau_de_certeza ?? 0,
          aiReason: ai.motivo ?? null,
          testsPassed: ai.tests_passed ?? null,
          testsTotal: ai.tests_total ?? null,
        },
      }).catch(() => {});

      io.to(`teacher:${roomId}`).emit("submission:evaluated", {
        submissionId: sub.id,
        studentId: sub.studentId,
        nickname: sub.student.nickname,
        questionId: sub.questionId,
        score: ai.correctness_score,
        summary: ai.summary,
        geradoPorIa: ai.gerado_por_ia,
        grauDeCerteza: ai.grau_de_certeza,
        motivo: ai.motivo,
        testsPassed: ai.tests_passed ?? null,
        testsTotal: ai.tests_total ?? null,
      });
    })
  );
}

async function createRoom(req, res, next) {
  try {
    const { name, timerSeconds } = req.body;

    // Gera código único de 6 caracteres alfanuméricos
    let code;
    let attempts = 0;
    do {
      code = generateRoomCode();
      const exists = await prisma.room.findUnique({ where: { code } });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({ error: "Failed to generate unique room code" });
    }

    const room = await prisma.room.create({
      data: {
        code,
        name,
        timerSeconds,
        teacherId: req.user.id,
      },
      include: { questions: true, students: true },
    });

    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
}

async function listRooms(req, res, next) {
  try {
    const rooms = await prisma.room.findMany({
      where: { teacherId: req.user.id },
      include: {
        _count: { select: { questions: true, students: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(rooms);
  } catch (err) {
    next(err);
  }
}

async function getRoom(req, res, next) {
  try {
    const room = await prisma.room.findFirst({
      where: { id: req.params.id, teacherId: req.user.id },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
        students: true,
      },
    });

    if (!room) return res.status(404).json({ error: "Room not found" });

    res.json(room);
  } catch (err) {
    next(err);
  }
}

async function deleteRoom(req, res, next) {
  try {
    const room = await prisma.room.findFirst({
      where: { id: req.params.id, teacherId: req.user.id },
    });

    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status === "ACTIVE") {
      return res.status(400).json({ error: "Cannot delete an active room" });
    }

    await prisma.room.delete({ where: { id: room.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function startRoom(req, res, next) {
  try {
    const room = await prisma.room.findFirst({
      where: { id: req.params.id, teacherId: req.user.id },
    });

    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status !== "WAITING") {
      return res.status(400).json({ error: `Room is already ${room.status.toLowerCase()}` });
    }

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: { status: "ACTIVE", startedAt: new Date() },
    });

    // Notifica todos os alunos da sala via Socket.io
    const io = getIO();
    io.to(`room:${room.code}`).emit("room:started", {
      startedAt: updated.startedAt,
      timerSeconds: updated.timerSeconds,
    });

    // Termina a sala automaticamente quando o timer expira
    setTimeout(async () => {
      const current = await prisma.room.findUnique({ where: { id: room.id } });
      if (current && current.status === "ACTIVE") {
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED" } });
        io.to(`room:${room.code}`).emit("room:finished");
        analyzeRoomSubmissions(room.id).catch((e) =>
          console.error("Erro na análise automática:", e.message)
        );
      }
    }, updated.timerSeconds * 1000);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function finishRoom(req, res, next) {
  try {
    const room = await prisma.room.findFirst({
      where: { id: req.params.id, teacherId: req.user.id },
    });

    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status !== "ACTIVE") {
      return res.status(400).json({ error: "Room is not active" });
    }

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: { status: "FINISHED" },
    });

    const io = getIO();
    io.to(`room:${room.code}`).emit("room:finished");

    analyzeRoomSubmissions(room.id).catch((e) =>
      console.error("Erro na análise:", e.message)
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { createRoom, listRooms, getRoom, deleteRoom, startRoom, finishRoom, analyzeRoomSubmissions };
