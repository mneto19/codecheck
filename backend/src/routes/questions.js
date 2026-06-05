// src/routes/questions.js

const router = require("express").Router();
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const questionController = require("../controllers/questionController");

const testCaseSchema = z.object({
  input: z.array(z.any()),
  expected: z.string(),
});

const questionSchema = z.object({
  roomId: z.string().uuid(),
  promptText: z.string().min(1).max(5000),
  referenceCode: z.string().min(1).max(20000),
  language: z.enum(["PYTHON", "JAVASCRIPT", "JAVA", "C", "CPP", "CSHARP"]),
  orderIndex: z.number().int().min(0),
  functionName: z.string().max(100).nullable().optional(),
  testCases: z.array(testCaseSchema).max(50).nullable().optional(),
});

const updateSchema = questionSchema.partial().omit({ roomId: true });

// Criação automática de testes (a partir do enunciado + referência)
const generateTestsSchema = z.object({
  promptText: z.string().min(1).max(5000),
  referenceCode: z.string().min(1).max(20000),
  language: z.enum(["PYTHON", "JAVASCRIPT", "JAVA", "C", "CPP", "CSHARP"]),
});

router.use(requireAuth);

router.post("/generate-tests", validate(generateTestsSchema), questionController.generateTests);
router.post("/", validate(questionSchema), questionController.createQuestion);
router.put("/:id", validate(updateSchema), questionController.updateQuestion);
router.delete("/:id", questionController.deleteQuestion);

module.exports = router;
