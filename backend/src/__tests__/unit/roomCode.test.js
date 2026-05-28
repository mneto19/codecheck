const { generateRoomCode } = require('../../utils/roomCode');

const ALLOWED = new Set('23456789ABCDEFGHJKLMNPQRSTUVWXYZ');

describe('generateRoomCode', () => {
  it('returns a string of exactly 6 characters', () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it('uses only allowed alphabet characters (no 0, 1, O, I)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      for (const ch of code) {
        expect(ALLOWED.has(ch)).toBe(true);
      }
    }
  });

  it('generates different codes across calls', () => {
    const codes = new Set(Array.from({ length: 20 }, generateRoomCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});
