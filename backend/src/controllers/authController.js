// src/controllers/authController.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");

const DB_TIMEOUT = 8000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error("Base de dados não respondeu a tempo."), { status: 503 })),
        ms
      )
    ),
  ]);
}

const COOKIE_NAME = "auth_token";

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function setCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "strict",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await withTimeout(prisma.user.findUnique({ where: { email } }), DB_TIMEOUT);
    if (existing) {
      return res.status(409).json({ error: "Email já registado." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = signToken(user.id);
    setCookie(res, token);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await withTimeout(prisma.user.findUnique({ where: { email } }), DB_TIMEOUT);

    // Hash dummy para tempo constante — previne timing attack mesmo quando email não existe
    const hashToCheck = user?.passwordHash ?? "$2b$12$invalidhashvaluefortimingatkxx";
    const valid = await bcrypt.compare(password, hashToCheck);

    if (!user || !valid) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const token = signToken(user.id);
    setCookie(res, token);
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  const { id, name, email, createdAt } = req.user;
  res.json({ id, name, email, createdAt });
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", secure: process.env.NODE_ENV === "production" });
  res.json({ ok: true });
}

module.exports = { register, login, me, logout };
