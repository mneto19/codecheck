// src/controllers/questionController.js

const prisma = require("../prisma/client");

async function createQuestion(req, res, next) {
  try {
    const { roomId, promptText, referenceCode, language, orderIndex } = req.body;

    // Confirm the room belongs to this teacher
    const room = await prisma.room.findFirst({
      where: { id: roomId, teacherId: req.user.id },
    });

    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status !== "WAITING") {
      return res.status(400).json({ error: "Cannot add questions to an active or finished room" });
    }

    const question = await prisma.question.create({
      data: { roomId, promptText, referenceCode, language, orderIndex },
    });

    // Return question WITHOUT referenceCode to avoid accidental exposure in logs
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

module.exports = { createQuestion, updateQuestion, deleteQuestion };
