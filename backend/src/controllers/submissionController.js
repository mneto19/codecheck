const prisma = require("../prisma/client");
const { enqueue } = require("../services/workerQueue");

async function submitCode(req, res, next) {
  try {
    const { questionId, studentCode, pasteCount, pastedChars } = req.body;
    const { student, room } = req;

    if (room.status !== "ACTIVE") {
      return res.status(400).json({ error: "O exame não está ativo." });
    }

    const question = await prisma.question.findFirst({
      where: { id: questionId, roomId: room.id },
    });

    if (!question) return res.status(404).json({ error: "Pergunta não encontrada." });

    // Cria ou atualiza a submissão
    const submission = await prisma.submission.upsert({
      where: {
        questionId_studentId: { questionId, studentId: student.id },
      },
      update: {
        studentCode,
        executionOutput: null,
        executionError: null,
        executionStatus: "Queued",
        aiCorrectnessScore: null,
        aiLogicDifferences: null,
        aiStyleNotes: null,
        aiSummary: null,
        pasteCount: pasteCount ?? 0,
        pastedChars: pastedChars ?? 0,
        submittedAt: new Date(),
      },
      create: {
        questionId,
        studentId: student.id,
        studentCode,
        executionStatus: "Queued",
        pasteCount: pasteCount ?? 0,
        pastedChars: pastedChars ?? 0,
      },
    });

    // Responde ao aluno imediatamente
    res.status(201).json({
      submissionId: submission.id,
      status: "Queued",
      message: "Submissão recebida. O output aparece em breve.",
    });

    // Envia para a fila do worker
    enqueue({
      submissionId: submission.id,
      studentCode,
      language: question.language,
      studentId: student.id,
      questionId,
      roomId: room.id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitCode };