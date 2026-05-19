const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

function parseCookies(header) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k.trim(), decodeURIComponent(v.join("="))];
    })
  );
}

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    // Alunos enviam token via auth.token; professores usam cookie httpOnly
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers.cookie) {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      token = cookies.auth_token;
    }

    if (!token) return next(new Error("Não autenticado"));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.payload = payload;
      next();
    } catch {
      next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket) => {
    const payload = socket.data.payload;

    if (payload.userId) {
      socket.on("teacher:join", (roomId) => {
        socket.join(`teacher:${roomId}`);
      });
    }

    if (payload.studentId) {
      socket.join(`room:${payload.roomCode}`);
      socket.join(`student:${payload.studentId}`);
    }

    socket.on("disconnect", () => {});
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { initSocket, getIO };
