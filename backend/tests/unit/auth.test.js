const request = require('supertest');
const app = require('../../src/app');

describe('Auth flow', () => {
  const email = `test_${Date.now()}@example.com`;
  const password = 'Password123!';

  it('registers a user', async () => {
    const res = await request(app).post('/auth/register').send({ email, password });
    expect([200, 201]).toContain(res.status);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('logs in and returns a JWT', async () => {
    const res = await request(app).post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
  });
});
