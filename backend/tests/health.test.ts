import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('API Health and Base Routes', () => {
  it('GET / should return root application info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Snack Overflow API');
    expect(res.body).toHaveProperty('status', 'active');
  });

  it('GET /api/health should return standardized healthy response', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'Snack Overflow Backend API is healthy');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('status', 'UP');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('environment');
    expect(res.body.data).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/non-existent-route should return standardized 404 error response', async () => {
    const res = await request(app).get('/api/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    expect(res.body).toHaveProperty('timestamp');
  });
});

