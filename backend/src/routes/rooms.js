// src/routes/rooms.js

const router = require("express").Router();
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const roomController = require("../controllers/roomController");

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  timerSeconds: z.number().int().min(60).max(10800), // de 1 minuto a 3 horas
});

// Todas as rotas de sala requerem autenticação de docente
router.use(requireAuth);

router.post("/", validate(createRoomSchema), roomController.createRoom);
router.get("/", roomController.listRooms);
router.get("/:id", roomController.getRoom);
router.delete("/:id", roomController.deleteRoom);

// Ciclo de vida da sala
router.post("/:id/start", roomController.startRoom);
router.post("/:id/finish", roomController.finishRoom);

module.exports = router;
