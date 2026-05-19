// src/routes/students.js

const router = require("express").Router();
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const studentController = require("../controllers/studentController");

const joinSchema = z.object({
  roomCode: z.string().length(6).toUpperCase(),
  nickname: z.string().min(1).max(30),
});

// Sem autenticação de docente — alunos entram com o código de sala
router.post("/join", validate(joinSchema), studentController.joinRoom);

// Dados da sala para o aluno (sem código de referência)
router.get("/room/:code", studentController.getRoomForStudent);

module.exports = router;
