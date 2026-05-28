const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../../prisma/client', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

const app = require('../../app');
const prisma = require('../../prisma/client');

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when email does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nope@test.com', password: 'anypassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciais inválidas.');
  });

  it('returns 401 when password is wrong', async () => {
    const hash = await bcrypt.hash('correctpassword', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      name: 'Test',
      email: 'test@test.com',
      passwordHash: hash,
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciais inválidas.');
  });

  it('returns 400 when email field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 409 when email is already registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@test.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@test.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email já registado.');
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'new@test.com', password: 'short' });
    expect(res.status).toBe(400);
  });
});
