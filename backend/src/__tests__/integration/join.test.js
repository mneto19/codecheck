const request = require('supertest');

jest.mock('../../prisma/client', () => ({
  room: { findUnique: jest.fn() },
  student: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../services/socketService', () => ({
  getIO: () => ({ to: () => ({ emit: jest.fn() }) }),
}));

const app = require('../../app');
const prisma = require('../../prisma/client');

const VALID_ROOM = {
  id: 'room1',
  code: 'ABCDEF',
  name: 'Test Room',
  status: 'WAITING',
  timerSeconds: 60,
  startedAt: null,
  questions: [],
};

describe('POST /api/students/join', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when room code is shorter than 6 chars', async () => {
    const res = await request(app)
      .post('/api/students/join')
      .send({ roomCode: 'ABC12', nickname: 'João', studentNumber: '12345' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when studentNumber is missing', async () => {
    const res = await request(app)
      .post('/api/students/join')
      .send({ roomCode: 'ABCDEF', nickname: 'João' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when studentNumber is empty string', async () => {
    const res = await request(app)
      .post('/api/students/join')
      .send({ roomCode: 'ABCDEF', nickname: 'João', studentNumber: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when nickname is missing', async () => {
    const res = await request(app)
      .post('/api/students/join')
      .send({ roomCode: 'ABCDEF', studentNumber: '12345' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when room code does not exist in DB', async () => {
    prisma.room.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/students/join')
      .send({ roomCode: 'XXXXXX', nickname: 'João', studentNumber: '12345' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Sala não encontrada.');
  });

  it('returns 400 when exam has already finished', async () => {
    prisma.room.findUnique.mockResolvedValue({ ...VALID_ROOM, status: 'FINISHED' });
    const res = await request(app)
      .post('/api/students/join')
      .send({ roomCode: 'ABCDEF', nickname: 'João', studentNumber: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Este exame já terminou.');
  });

  it('returns 409 when nickname is already taken by a different student number', async () => {
    prisma.room.findUnique.mockResolvedValue(VALID_ROOM);
    const uniqueError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    prisma.student.create.mockRejectedValue(uniqueError);
    prisma.student.findFirst.mockResolvedValue({
      id: 'student1',
      nickname: 'João',
      studentNumber: '99999',
    });

    const res = await request(app)
      .post('/api/students/join')
      .send({ roomCode: 'ABCDEF', nickname: 'João', studentNumber: '12345' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Nickname já em uso nesta sala.');
  });

  it('returns 201 and a token on successful join', async () => {
    prisma.room.findUnique.mockResolvedValue(VALID_ROOM);
    prisma.student.create.mockResolvedValue({
      id: 'student1',
      nickname: 'João',
      studentNumber: '12345',
      joinedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/students/join')
      .send({ roomCode: 'ABCDEF', nickname: 'João', studentNumber: '12345' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.student.studentNumber).toBe('12345');
  });
});
