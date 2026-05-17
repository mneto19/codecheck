const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const prisma = require("../prisma/client");
const { analyzeRoomSubmissions } = require("../controllers/roomController");

router.get("/room/:roomId", requireAuth, async (req, res, next) => {
  try {
    const room = await prisma.room.findFirst({
      where: { id: req.params.roomId, teacherId: req.user.id },
    });

    if (!room) return res.status(404).json({ error: "Room not found" });

    const students = await prisma.student.findMany({
      where: { roomId: room.id },
      include: {
        submissions: {
          include: {
            question: {
              select: { id: true, promptText: true, language: true, orderIndex: true },
            },
          },
        },
      },
    });

    res.json({ room, students });
  } catch (err) {
    next(err);
  }
});

router.get("/submission/:id", requireAuth, async (req, res, next) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        student: true,
        question: {
          include: { room: true },
        },
      },
    });

    if (!submission || submission.question.room.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.json({
      ...submission,
      referenceCode: submission.question.referenceCode,
      referenceOutput: submission.question.referenceOutput || null,
    });
  } catch (err) {
    next(err);
  }
});

// Re-analisa todas as submissões de uma sala terminada
router.post("/room/:roomId/analyze", requireAuth, async (req, res, next) => {
  try {
    const room = await prisma.room.findFirst({
      where: { id: req.params.roomId, teacherId: req.user.id },
    });
    if (!room) return res.status(404).json({ error: "Room not found" });

    res.json({ message: "Análise iniciada." });
    analyzeRoomSubmissions(room.id).catch((e) =>
      console.error("Re-análise falhou:", e.message)
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
