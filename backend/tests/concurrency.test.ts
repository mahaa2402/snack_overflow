/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/database';

const app = createApp();

describe('Atomic Concurrency & Stock Transaction Tests', () => {
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@snackoverflow.com',
      password: 'Admin@123',
    });
    adminToken = adminRes.body.data.token;

    // 2. Authenticate Member
    const memberRes = await request(app).post('/api/auth/login').send({
      email: 'priya@snackoverflow.com',
      password: 'Member@123',
    });
    memberToken = memberRes.body.data.token;
  });

  describe('Concurrency: 10 Simultaneous Requests to Consume the Last 3 Packets', () => {
    let concurrencySnackId: string;
    const testSnackName = `Concurrency_Limited_Snack_${Date.now()}`;

    beforeAll(async () => {
      // Create a dedicated snack with EXACTLY 3 items in stock
      const createRes = await request(app)
        .post('/snacks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: testSnackName,
          category: 'SWEET',
          quantity: 3,
          lowStockThreshold: 1,
        });

      expect(createRes.status).toBe(201);
      concurrencySnackId = createRes.body.data.id;

      // Verify initial state in DB
      const initial = await prisma.snack.findUnique({
        where: { id: concurrencySnackId },
      });
      expect(initial?.quantity).toBe(3);
    });

    it('simulates 10 concurrent requests: exactly 3 succeed (200), 7 fail with 409, final stock is 0, 3 activities logged', async () => {
      // Fire 10 simultaneous requests using Promise.all
      const requests = Array.from({ length: 10 }, (_, index) =>
        request(app)
          .post(`/snacks/${concurrencySnackId}/consume`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ amount: 1 })
          .then((res) => ({ index, status: res.status, body: res.body }))
      );

      const results = await Promise.all(requests);

      // Analyze HTTP response statuses
      const successfulRequests = results.filter((r) => r.status === 200);
      const conflictRequests = results.filter((r) => r.status === 409);
      const otherRequests = results.filter((r) => r.status !== 200 && r.status !== 409);

      expect(otherRequests).toHaveLength(0);
      expect(successfulRequests).toHaveLength(3);
      expect(conflictRequests).toHaveLength(7);

      // Verify all 7 conflicts returned the standard INSUFFICIENT_STOCK code
      for (const conflict of conflictRequests) {
        expect(conflict.body).toHaveProperty('success', false);
        expect(conflict.body.error).toHaveProperty('code', 'INSUFFICIENT_STOCK');
      }

      // Verify final database state: quantity is exactly 0, never negative
      const finalSnack = await prisma.snack.findUnique({
        where: { id: concurrencySnackId },
      });
      expect(finalSnack?.quantity).toBe(0);

      // Verify database activities: exactly 3 consumption activity records created
      const activities = await prisma.activity.findMany({
        where: {
          snackId: concurrencySnackId,
          action: 'CONSUMED',
        },
      });
      expect(activities).toHaveLength(3);
      for (const act of activities) {
        expect(act.amount).toBe(1);
      }
    });

    it('subsequent consume attempt when stock is 0 returns 409 Conflict', async () => {
      const res = await request(app)
        .post(`/snacks/${concurrencySnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 1 });

      expect(res.status).toBe(409);
      expect(res.body.error).toHaveProperty('code', 'INSUFFICIENT_STOCK');
    });

    it('consume returns 404 when snack does not exist', async () => {
      const res = await request(app)
        .post('/snacks/00000000-0000-0000-0000-000000000000/consume')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 1 });

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('consume returns 400 for negative or non-integer amount', async () => {
      const res1 = await request(app)
        .post(`/snacks/${concurrencySnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: -2 });

      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post(`/snacks/${concurrencySnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 1.5 });

      expect(res2.status).toBe(400);
    });

    it('Admin can restock snack safely in the same transaction', async () => {
      const res = await request(app)
        .post(`/snacks/${concurrencySnackId}/restock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 15 });

      expect(res.status).toBe(200);
      expect(res.body.data.snack.quantity).toBe(15);
      expect(res.body.data.snack.status).toBe('STOCKED');
      expect(res.body.data.activity.action).toBe('RESTOCKED');
      expect(res.body.data.activity.amount).toBe(15);

      // Verify in DB
      const inDb = await prisma.snack.findUnique({
        where: { id: concurrencySnackId },
      });
      expect(inDb?.quantity).toBe(15);
    });

    it('Member is forbidden from restocking snack (403)', async () => {
      const res = await request(app)
        .post(`/snacks/${concurrencySnackId}/restock`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 10 });

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });
  });
});

