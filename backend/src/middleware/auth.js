// src/middleware/auth.js

const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");

async function requireAuth(req, res, next) {
  // Lê o token do cookie httpOnly primeiro; fallback para Authorization header
  // (o header é usado pelos tokens de aluno em sessionStorage)
  const token =
    req.cookies?.auth_token ||
    req.headers.authorization?.replace(/^Bearer /, "");

  if (!token) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      return res.status(401).json({ error: "Utilizador não encontrado." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

module.exports = { requireAuth };
