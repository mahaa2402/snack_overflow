import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Snacks API & Pantry Management Endpoints', () => {
  let adminToken: string;
  let memberToken: string;
  let testSnackId: string;

  beforeAll(async () => {
    // Authenticate Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@snackoverflow.com',
      password: 'Admin@123',
    });
    adminToken = adminRes.body.data.token;

    // Authenticate Member
    const memberRes = await request(app).post('/api/auth/login').send({
      email: 'alice@snackoverflow.com',
      password: 'Member@123',
    });
    memberToken = memberRes.body.data.token;
  });

  it('GET /api/snacks - should return paginated snacks with derived status', async () => {
    const res = await request(app).get('/api/snacks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data.items.length).toBeGreaterThan(0);

    const first = res.body.data.items[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('status');
    expect(['STOCKED', 'RUNNING_LOW', 'GONE']).toContain(first.status);
    expect(first).toHaveProperty('voteCount');

    testSnackId = first.id;
  });

  it('GET /api/snacks/stats - should return pantry summary statistics', async () => {
    const res = await request(app).get('/api/snacks/stats');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalSnacks');
    expect(res.body.data).toHaveProperty('totalQuantity');
    expect(res.body.data).toHaveProperty('runningLowCount');
    expect(res.body.data).toHaveProperty('outOfStockCount');
    expect(res.body.data).toHaveProperty('stockedCount');
  });

  it('GET /api/snacks/popular - should return top voted snacks', async () => {
    const res = await request(app).get('/api/snacks/popular?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
    if (res.body.data.length > 1) {
      expect(res.body.data[0].voteCount).toBeGreaterThanOrEqual(res.body.data[1].voteCount);
    }
  });

  it('POST /api/snacks/:id/vote - Member can toggle vote for a snack', async () => {
    const res = await request(app)
      .post(`/api/snacks/${testSnackId}/vote`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('hasVoted');
    expect(res.body.data).toHaveProperty('voteCount');
  });

  it('POST /api/snacks/:id/consume - Member can consume an available snack', async () => {
    // Find a stocked snack
    const listRes = await request(app).get('/api/snacks?status=STOCKED');
    const targetSnack = listRes.body.data.items[0];

    const res = await request(app)
      .post(`/api/snacks/${targetSnack.id}/consume`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ amount: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('snack');
    expect(res.body.data).toHaveProperty('activity');
    expect(res.body.data.snack.quantity).toBe(targetSnack.quantity - 1);
  });

  it('POST /api/admin/snacks - Admin can create a new snack', async () => {
    const uniqueSnackName = `Artisan Trail Mix ${Date.now()}`;
    const res = await request(app)
      .post('/api/admin/snacks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: uniqueSnackName,
        category: 'HEALTHY_ISH',
        quantity: 15,
        lowStockThreshold: 4,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe(uniqueSnackName);
    expect(res.body.data.status).toBe('STOCKED');
  });

  it('POST /api/admin/snacks - Member is forbidden from creating snacks', async () => {
    const res = await request(app)
      .post('/api/admin/snacks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        name: 'Unauthorized Snack',
        category: 'SWEET',
        quantity: 10,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('POST /api/admin/snacks/:id/restock - Admin can restock inventory', async () => {
    const res = await request(app)
      .post(`/api/admin/snacks/${testSnackId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('snack');
    expect(res.body.data).toHaveProperty('activity');
    expect(res.body.data.activity.action).toBe('RESTOCKED');
  });
});

