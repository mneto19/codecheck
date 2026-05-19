// src/app.js

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const questionRoutes = require("./routes/questions");
const studentRoutes = require("./routes/students");
const submissionRoutes = require("./routes/submissions");
const resultRoutes = require("./routes/results");

const app = express();

// Headers de segurança HTTP
app.use(helmet());

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",").map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Cookie parser (para httpOnly auth_token)
app.use(cookieParser());

// Body parser
app.use(express.json({ limit: "1mb" }));

// Global rate limiter (per IP)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, try again later." },
  })
);

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts, try again later." },
});

// Rate limiter mais apertado para tentativas de entrada em sala (dificulta brute-force de códigos)
const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiadas tentativas. Tenta novamente mais tarde." },
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/students/join", joinLimiter);
app.use("/api/students", studentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/results", resultRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Swagger docs (only in dev)
if (process.env.NODE_ENV !== "production") {
  try {
    const YAML = require("yamljs");
    const swaggerDoc = YAML.load("./swagger.yaml");
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    console.log("Swagger docs available at /docs");
  } catch {
    console.log("swagger.yaml not found, skipping docs");
  }
}

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler — esconde detalhes internos em produção
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === "production" && status === 500
    ? "Erro interno do servidor."
    : err.message || "Erro interno do servidor.";
  res.status(status).json({ error: message });
});

module.exports = app;
