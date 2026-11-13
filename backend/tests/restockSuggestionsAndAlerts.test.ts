/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/database';

const app = createApp();

describe('Smart Restock List & Alert Notification System', () => {
  let adminToken: string;
  let memberToken: string;
  let adminUserId: string;

  const testSnackCritical = `Test_Snack_Critical_${Date.now()}`;
  const testSnackHigh = `Test_Snack_High_${Date.now()}`;
  const testSnackMedium = `Test_Snack_Medium_${Date.now()}`;
  const testSnackStocked = `Test_Snack_Stocked_${Date.now()}`;

  let criticalSnackId: string;
  let highSnackId: string;
  let mediumSnackId: string;
  let stockedSnackId: string;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@snackoverflow.com',
      password: 'Admin@123',
    });
    adminToken = adminRes.body.data.token;
    adminUserId = adminRes.body.data.user.id;

    // 2. Authenticate Member
    const memberRes = await request(app).post('/api/auth/login').send({
      email: 'priya@snackoverflow.com',
      password: 'Member@123',
    });
    memberToken = memberRes.body.data.token;

    // 3. Create test snacks
    // Critical: quantity = 0, threshold = 5
    const cRes = await request(app)
      .post('/snacks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testSnackCritical,
        category: 'DRINK',
        quantity: 0,
        lowStockThreshold: 5,
      });
    criticalSnackId = cRes.body.data.id;

    // High: quantity = 2 (<= threshold / 2), threshold = 5
    const hRes = await request(app)
      .post('/snacks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testSnackHigh,
        category: 'DRINK',
        quantity: 2,
        lowStockThreshold: 5,
      });
    highSnackId = hRes.body.data.id;

    // Medium: quantity = 5 (<= threshold), threshold = 5
    const mRes = await request(app)
      .post('/snacks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testSnackMedium,
        category: 'SWEET',
        quantity: 5,
        lowStockThreshold: 5,
      });
    mediumSnackId = mRes.body.data.id;

    // Stocked: quantity = 25 (> threshold), threshold = 5
    const sRes = await request(app)
      .post('/snacks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testSnackStocked,
        category: 'SAVOURY',
        quantity: 25,
        lowStockThreshold: 5,
      });
    stockedSnackId = sRes.body.data.id;

    // Add recent consumption activity for highSnackId (7 units over last 7 days => avg 1 unit/day)
    await prisma.activity.create({
      data: {
        userId: adminUserId,
        snackId: highSnackId,
        action: 'CONSUMED',
        amount: 7,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    });
  });

  afterAll(async () => {
    // Cleanup test snacks and their activities
    const ids = [criticalSnackId, highSnackId, mediumSnackId, stockedSnackId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.activity.deleteMany({ where: { snackId: { in: ids } } });
      await prisma.vote.deleteMany({ where: { snackId: { in: ids } } });
      await prisma.snack.deleteMany({ where: { id: { in: ids } } });
    }
  });

  describe('Authentication & Role-Based Authorization', () => {
    it('GET /restock/suggestions - rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/restock/suggestions');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /restock/suggestions - rejects regular MEMBER requests with 403', async () => {
      const res = await request(app)
        .get('/restock/suggestions')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('GET /restock/suggestions - allows ADMIN requests with 200', async () => {
      const res = await request(app)
        .get('/restock/suggestions')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /restock/all - rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/restock/all').send({});
      expect(res.status).toBe(401);
    });

    it('POST /restock/all - rejects regular MEMBER requests with 403', async () => {
      const res = await request(app)
        .post('/restock/all')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('GET /alerts - rejects regular MEMBER requests with 403', async () => {
      const res = await request(app)
        .get('/alerts')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /alerts - allows ADMIN requests with 200', async () => {
      const res = await request(app)
        .get('/alerts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Smart Restock Suggestions & Urgency Calculations', () => {
    it('returns running-low and gone snacks, excluding well-stocked snacks', async () => {
      const res = await request(app)
        .get('/restock/suggestions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const suggestions = res.body.data;

      const criticalFound = suggestions.find((s: any) => s.snackId === criticalSnackId);
      const highFound = suggestions.find((s: any) => s.snackId === highSnackId);
      const mediumFound = suggestions.find((s: any) => s.snackId === mediumSnackId);
      const stockedFound = suggestions.find((s: any) => s.snackId === stockedSnackId);

      expect(criticalFound).toBeDefined();
      expect(highFound).toBeDefined();
      expect(mediumFound).toBeDefined();
      expect(stockedFound).toBeUndefined(); // Well-stocked must NOT appear
    });

    it('correctly derives CRITICAL urgency for completely out of stock snack (quantity = 0)', async () => {
      const res = await request(app)
        .get('/restock/suggestions')
        .set('Authorization', `Bearer ${adminToken}`);

      const critical = res.body.data.find((s: any) => s.snackId === criticalSnackId);
      expect(critical.urgency).toBe('CRITICAL');
      expect(critical.currentQuantity).toBe(0);
      expect(critical.daysLeft).toBe(0);
      expect(critical.suggestedQuantity).toBeGreaterThanOrEqual(5);
    });

    it('calculates average daily consumption, days left and HIGH urgency', async () => {
      const res = await request(app)
        .get('/restock/suggestions')
        .set('Authorization', `Bearer ${adminToken}`);

      const high = res.body.data.find((s: any) => s.snackId === highSnackId);
      expect(high.urgency).toBe('HIGH');
      expect(high.totalConsumedLast7Days).toBe(7);
      expect(high.avgDailyConsumption).toBe(1); // 7 units / 7 days
      expect(high.daysLeft).toBe(2); // 2 units / 1 unit/day
      expect(high.suggestedQuantity).toBeGreaterThanOrEqual(5);
    });

    it('supports category filtering on GET /restock/suggestions', async () => {
      const res = await request(app)
        .get('/restock/suggestions?category=SWEET')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const suggestions = res.body.data;
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      for (const s of suggestions) {
        expect(s.category).toBe('SWEET');
      }
    });

    it('rejects invalid category with 400', async () => {
      const res = await request(app)
        .get('/restock/suggestions?category=INVALID_CAT')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Live Stock Alerts (GET /alerts)', () => {
    it('returns CRITICAL alert for out of stock snack and WARNING for low snack', async () => {
      const res = await request(app)
        .get('/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const alerts = res.body.data;

      const criticalAlert = alerts.find((a: any) => a.snackId === criticalSnackId);
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert.severity).toBe('CRITICAL');
      expect(criticalAlert.currentQuantity).toBe(0);

      const warningAlert = alerts.find((a: any) => a.snackId === highSnackId);
      expect(warningAlert).toBeDefined();
      expect(warningAlert.severity).toBe('WARNING');
    });
  });

  describe('Atomic Batch Restock (POST /restock/all) & Transaction Rollback', () => {
    it('successfully restocks multiple snacks with custom quantities in one transaction', async () => {
      const initialCritical = await prisma.snack.findUnique({ where: { id: criticalSnackId } });
      const initialHigh = await prisma.snack.findUnique({ where: { id: highSnackId } });

      const res = await request(app)
        .post('/restock/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { snackId: criticalSnackId, amount: 15 },
            { snackId: highSnackId, amount: 20 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.restockedCount).toBe(2);
      expect(res.body.data.totalUnitsAdded).toBe(35);

      // Verify database updates
      const updatedCritical = await prisma.snack.findUnique({ where: { id: criticalSnackId } });
      const updatedHigh = await prisma.snack.findUnique({ where: { id: highSnackId } });

      expect(updatedCritical?.quantity).toBe((initialCritical?.quantity || 0) + 15);
      expect(updatedHigh?.quantity).toBe((initialHigh?.quantity || 0) + 20);

      // Verify Activity audit records were created
      const activities = await prisma.activity.findMany({
        where: {
          snackId: { in: [criticalSnackId, highSnackId] },
          action: 'RESTOCKED',
        },
      });
      expect(activities.length).toBeGreaterThanOrEqual(2);
    });

    it('rolls back ENTIRE transaction if any item has invalid amount (<= 0 or non-integer)', async () => {
      const beforeMedium = await prisma.snack.findUnique({ where: { id: mediumSnackId } });

      const res = await request(app)
        .post('/restock/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { snackId: mediumSnackId, amount: 10 },
            { snackId: criticalSnackId, amount: -5 }, // INVALID!
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      // Verify COMPLETE ROLLBACK: mediumSnack quantity must remain completely unchanged
      const afterMedium = await prisma.snack.findUnique({ where: { id: mediumSnackId } });
      expect(afterMedium?.quantity).toBe(beforeMedium?.quantity);
    });

    it('rolls back ENTIRE transaction if any snackId does not exist (404)', async () => {
      const beforeMedium = await prisma.snack.findUnique({ where: { id: mediumSnackId } });

      const res = await request(app)
        .post('/restock/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { snackId: mediumSnackId, amount: 10 },
            { snackId: '00000000-0000-0000-0000-000000000000', amount: 10 }, // Non-existent
          ],
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify COMPLETE ROLLBACK
      const afterMedium = await prisma.snack.findUnique({ where: { id: mediumSnackId } });
      expect(afterMedium?.quantity).toBe(beforeMedium?.quantity);
    });
  });

  describe('Concurrent Restocking & Consumption Integrity', () => {
    it('handles concurrent restock and consume operations atomically without negative stock or corruption', async () => {
      // Set medium snack quantity to 5
      await prisma.snack.update({
        where: { id: mediumSnackId },
        data: { quantity: 5 },
      });

      // Fire 5 consumes of 1 unit and 2 restocks of 5 units concurrently
      const consumeReqs = Array.from({ length: 5 }, () =>
        request(app)
          .post(`/snacks/${mediumSnackId}/consume`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ amount: 1 })
      );

      const restockReqs = Array.from({ length: 2 }, () =>
        request(app)
          .post('/restock/all')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ items: [{ snackId: mediumSnackId, amount: 5 }] })
      );

      const allResults = await Promise.all([...consumeReqs, ...restockReqs]);

      // None of the responses should have internal server errors (500)
      for (const r of allResults) {
        expect(r.status).toBeLessThan(500);
      }

      // Check final database quantity: Initial(5) - 5 consumes(5) + 2 restocks(10) = 10
      const finalSnack = await prisma.snack.findUnique({
        where: { id: mediumSnackId },
      });

      expect(finalSnack?.quantity).toBe(10);
      expect(finalSnack?.quantity).toBeGreaterThanOrEqual(0); // Stock must NEVER be negative
    });
  });
});

