const { customAlphabet } = require("nanoid");

const generate = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

function generateRoomCode() {
  return generate();
}

module.exports = { generateRoomCode };
