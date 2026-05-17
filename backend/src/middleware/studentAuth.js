// src/middleware/studentAuth.js

const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");

async function requireStudentAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.studentId || !payload.roomId) {
      return res.status(401).json({ error: "Invalid student token" });
    }

    const student = await prisma.student.findUnique({
      where: { id: payload.studentId },
      include: { room: true },
    });

    if (!student) {
      return res.status(401).json({ error: "Student session not found" });
    }

    req.student = student;
    req.room = student.room;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireStudentAuth };