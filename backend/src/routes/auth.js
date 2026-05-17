// src/routes/auth.js

const router = require("express").Router();
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const authController = require("../controllers/authController");

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", require("../middleware/auth").requireAuth, authController.me);

module.exports = router;
