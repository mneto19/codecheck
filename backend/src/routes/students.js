// src/routes/students.js

const router = require("express").Router();
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const studentController = require("../controllers/studentController");

const joinSchema = z.object({
  roomCode: z.string().length(6).toUpperCase(),
  nickname: z.string().min(1).max(30),
});

// No teacher auth - students join with room code only
router.post("/join", validate(joinSchema), studentController.joinRoom);

// Get room info for a student session (no reference codes)
router.get("/room/:code", studentController.getRoomForStudent);

module.exports = router;
