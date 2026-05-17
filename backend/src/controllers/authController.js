// src/controllers/authController.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = signToken(user.id);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Hash dummy para tempo constante — previne timing attack mesmo quando email não existe
    const hashToCheck = user?.passwordHash ?? "$2b$12$invalidhashvaluefortimingatkxx";
    const valid = await bcrypt.compare(password, hashToCheck);

    if (!user || !valid) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const token = signToken(user.id);
    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  const { id, name, email, createdAt } = req.user;
  res.json({ id, name, email, createdAt });
}

module.exports = { register, login, me };
