const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");
const { getIO } = require("../services/socketService");

async function joinRoom(req, res, next) {
  try {
    const { roomCode, nickname, studentNumber } = req.body;

    const roomCodeUpper = (roomCode || "").toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(roomCodeUpper)) {
      return res.status(400).json({ error: "Código de sala inválido." });
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCodeUpper },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            promptText: true,
            language: true,
            orderIndex: true,
          },
        },
      },
    });

    if (!room) return res.status(404).json({ error: "Sala não encontrada." });
    if (room.status === "FINISHED") {
      return res.status(400).json({ error: "Este exame já terminou." });
    }

    let student;
    try {
      student = await prisma.student.create({
        data: { roomId: room.id, nickname, studentNumber: studentNumber || null },
      });
    } catch (err) {
      if (err.code === "P2002") {
        student = await prisma.student.findFirst({
          where: { roomId: room.id, nickname },
        });
        if (!student) throw err;
        if (studentNumber && !student.studentNumber) {
          student = await prisma.student.update({
            where: { id: student.id },
            data: { studentNumber },
          });
        }
      } else {
        throw err;
      }
    }

    const token = jwt.sign(
      { studentId: student.id, roomId: room.id, roomCode: room.code },
      process.env.JWT_SECRET,
      { expiresIn: "4h" }
    );

    const io = getIO();
    io.to(`teacher:${room.id}`).emit("student:joined", {
      id: student.id,
      nickname: student.nickname,
      studentNumber: student.studentNumber,
      joinedAt: student.joinedAt,
    });

    res.status(201).json({
      student: {
        id: student.id,
        nickname: student.nickname,
        studentNumber: student.studentNumber,
      },
      token,
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        status: room.status,
        timerSeconds: room.timerSeconds,
        startedAt: room.startedAt,
        questions: room.questions,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getRoomForStudent(req, res, next) {
  try {
    const room = await prisma.room.findUnique({
      where: { code: req.params.code.toUpperCase() },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            promptText: true,
            language: true,
            orderIndex: true,
          },
        },
      },
    });

    if (!room) return res.status(404).json({ error: "Sala não encontrada." });

    res.json({
      id: room.id,
      code: room.code,
      name: room.name,
      status: room.status,
      timerSeconds: room.timerSeconds,
      startedAt: room.startedAt,
      questions: room.questions,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { joinRoom, getRoomForStudent };
