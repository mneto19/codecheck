// src/routes/submissions.js

const router = require("express").Router();
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const submissionController = require("../controllers/submissionController");
const { requireStudentAuth } = require("../middleware/studentAuth");

const submitSchema = z.object({
  questionId: z.string().uuid(),
  studentCode: z.string().min(1).max(20000, "Código demasiado longo."),
});

// Student submits code
router.post("/", requireStudentAuth, validate(submitSchema), submissionController.submitCode);

module.exports = router;
