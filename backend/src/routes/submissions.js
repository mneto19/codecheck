// src/routes/submissions.js

const router = require("express").Router();
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const submissionController = require("../controllers/submissionController");
const { requireStudentAuth } = require("../middleware/studentAuth");

const submitSchema = z.object({
  questionId: z.string().uuid(),
  studentCode: z.string().min(1).max(20000, "Código demasiado longo."),
  // Telemetria de "paste" (deteção de AI)
  pasteCount: z.number().int().min(0).max(10000).optional(),
  pastedChars: z.number().int().min(0).max(1000000).optional(),
});

// Submissão de código pelo aluno
router.post("/", requireStudentAuth, validate(submitSchema), submissionController.submitCode);

module.exports = router;
