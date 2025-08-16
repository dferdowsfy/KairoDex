import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USER_EMAIL = __ENV.SEED_EMAIL || 'seed@example.com';
const USER_PASSWORD = __ENV.SEED_PASSWORD || 'Password123!';

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
  stages: [
    { duration: '30s', target: 500 },
    { duration: '2m', target: 500 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'has token': (r) => !!r.json('token'),
  });
  const token = loginRes.json('token');

  // Get projects list
  const projRes = http.get(`${BASE_URL}/projects?page=1&pageSize=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(projRes, {
    'projects status 200': (r) => r.status === 200,
  });

  sleep(1);
}
