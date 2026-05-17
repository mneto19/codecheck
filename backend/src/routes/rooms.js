// src/routes/rooms.js

const router = require("express").Router();
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const roomController = require("../controllers/roomController");

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  timerSeconds: z.number().int().min(60).max(10800), // 1 min to 3 hours
});

// All room management requires teacher auth
router.use(requireAuth);

router.post("/", validate(createRoomSchema), roomController.createRoom);
router.get("/", roomController.listRooms);
router.get("/:id", roomController.getRoom);
router.delete("/:id", roomController.deleteRoom);

// Room lifecycle
router.post("/:id/start", roomController.startRoom);
router.post("/:id/finish", roomController.finishRoom);

module.exports = router;
