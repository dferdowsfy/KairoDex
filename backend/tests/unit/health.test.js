const request = require('supertest');
const app = require('../../src/app');

describe('GET /health', () => {
  it('returns ok with version and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('timestamp');
  });
});
