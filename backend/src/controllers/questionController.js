const prisma = require("../prisma/client");
const { generateTestInputs } = require("../services/aiService");
const {
  isTestSupported,
  extractFunctionName,
  computeExpectedFromReference,
} = require("../services/testRunnerService");

async function createQuestion(req, res, next) {
  try {
    const { roomId, promptText, referenceCode, language, orderIndex, functionName, testCases } = req.body;

    // Verifica que a sala pertence a este docente
    const room = await prisma.room.findFirst({
      where: { id: roomId, teacherId: req.user.id },
    });

    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status !== "WAITING") {
      return res.status(400).json({ error: "Cannot add questions to an active or finished room" });
    }

    const question = await prisma.question.create({
      data: {
        roomId,
        promptText,
        referenceCode,
        language,
        orderIndex,
        functionName: functionName ?? null,
        testCases: testCases ?? undefined,
      },
    });

    // Não expõe o referenceCode na resposta
    const { referenceCode: _, ...safeQuestion } = question;
    res.status(201).json(safeQuestion);
  } catch (err) {
    next(err);
  }
}

async function updateQuestion(req, res, next) {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id },
      include: { room: true },
    });

    if (!question || question.room.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Question not found" });
    }

    if (question.room.status !== "WAITING") {
      return res.status(400).json({ error: "Cannot edit questions in an active or finished room" });
    }

    const updated = await prisma.question.update({
      where: { id: question.id },
      data: req.body,
    });

    const { referenceCode: _, ...safeQuestion } = updated;
    res.json(safeQuestion);
  } catch (err) {
    next(err);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id },
      include: { room: true },
    });

    if (!question || question.room.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Question not found" });
    }

    if (question.room.status !== "WAITING") {
      return res.status(400).json({ error: "Cannot delete questions from an active or finished room" });
    }

    await prisma.question.delete({ where: { id: question.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Cria casos de teste a partir do enunciado + referência (Python/JS).
// A IA sugere os inputs; os outputs esperados saem de correr a referência do professor.
async function generateTests(req, res, next) {
  try {
    const { promptText, referenceCode, language } = req.body;

    if (!isTestSupported(language)) {
      return res.status(400).json({
        error: "Correção por testes disponível apenas para Python e JavaScript.",
      });
    }

    const functionName = extractFunctionName(referenceCode, language);
    if (!functionName) {
      return res.status(422).json({
        error: "Não foi possível identificar a função no código de referência.",
      });
    }

    const inputs = await generateTestInputs({ promptText, language, referenceCode, functionName });
    if (!inputs.length) {
      return res.status(422).json({
        error: "A IA não conseguiu gerar inputs. Tenta novamente ou adiciona testes manualmente.",
      });
    }

    const testCases = await computeExpectedFromReference(referenceCode, language, functionName, inputs);
    if (!testCases.length) {
      return res.status(422).json({
        error: "A referência não produziu resultados válidos para os inputs gerados.",
      });
    }

    res.json({ functionName, testCases });
  } catch (err) {
    next(err);
  }
}

module.exports = { createQuestion, updateQuestion, deleteQuestion, generateTests };
