require("dotenv").config();

// Valida variáveis de ambiente obrigatórias ao arrancar
const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL", "GROQ_API_KEY", "JDOODLE_CLIENT_ID", "JDOODLE_CLIENT_SECRET"];
for (const v of REQUIRED_ENV) {
  if (!process.env[v]) throw new Error(`Variável de ambiente obrigatória em falta: ${v}`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres");
}

const http = require("http");
const app = require("./app");
const { initSocket, getIO } = require("./services/socketService");
const { analyzeRoomSubmissions } = require("./controllers/roomController");
const prisma = require("./prisma/client");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
initSocket(server);

// Recupera salas ativas que possam ter ficado presas após um reinício do servidor
async function recoverExpiredRooms() {
  const activeRooms = await prisma.room.findMany({ where: { status: "ACTIVE" } });
  if (!activeRooms.length) return;

  const io = getIO();
  for (const room of activeRooms) {
    const endTime = new Date(room.startedAt).getTime() + room.timerSeconds * 1000;
    const remaining = endTime - Date.now();

    if (remaining <= 0) {
      // Já devia ter terminado — termina agora
      await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED" } });
      io.to(`room:${room.code}`).emit("room:finished");
      analyzeRoomSubmissions(room.id).catch(() => {});
    } else {
      // Reagenda o timer com o tempo restante
      setTimeout(async () => {
        const current = await prisma.room.findUnique({ where: { id: room.id } });
        if (current?.status === "ACTIVE") {
          await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED" } });
          io.to(`room:${room.code}`).emit("room:finished");
          analyzeRoomSubmissions(room.id).catch(() => {});
        }
      }, remaining);
    }
  }
  console.log(`[Startup] ${activeRooms.length} sala(s) ativa(s) recuperada(s)`);
}

server.listen(PORT, () => {
  console.log(`CodeCheck backend a correr na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);
  recoverExpiredRooms().catch((e) => console.error("Erro ao recuperar salas:", e.message));
});

process.on("unhandledRejection", (err) => {
  console.error("Rejeição não tratada:", err);
  server.close(() => process.exit(1));
});
