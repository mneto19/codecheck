const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.payload = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
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
