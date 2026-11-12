import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Snack Management REST APIs (GET, POST, PATCH, DELETE /snacks)', () => {
  let adminToken: string;
  let memberToken: string;
  let createdSnackId: string;
  const uniquePrefix = `TestSnack_${Date.now()}`;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@snackoverflow.com',
      password: 'Admin@123',
    });
    adminToken = adminRes.body.data.token;

    // 2. Authenticate Member
    const memberRes = await request(app).post('/api/auth/login').send({
      email: 'alice@snackoverflow.com',
      password: 'Member@123',
    });
    memberToken = memberRes.body.data.token;
  });

  // ==========================================
  // 1. POST /snacks (Admin Only)
  // ==========================================
  describe('POST /snacks', () => {
    it('Admin can create a new snack with valid payload', async () => {
      const res = await request(app)
        .post('/snacks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${uniquePrefix}_Almond_Bar`,
          category: 'HEALTHY_ISH',
          quantity: 20,
          lowStockThreshold: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(`${uniquePrefix}_Almond_Bar`);
      expect(res.body.data.category).toBe('HEALTHY_ISH');
      expect(res.body.data.quantity).toBe(20);
      expect(res.body.data.status).toBe('STOCKED');

      createdSnackId = res.body.data.id;
    });

    it('Member is forbidden from creating snacks (403)', async () => {
      const res = await request(app)
        .post('/snacks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: `${uniquePrefix}_MemberAttempt`,
          category: 'SWEET',
          quantity: 10,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });

    it('Unauthenticated user receives 401', async () => {
      const res = await request(app).post('/snacks').send({
        name: `${uniquePrefix}_AnonAttempt`,
        category: 'SWEET',
        quantity: 10,
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('Rejects negative quantity with 400', async () => {
      const res = await request(app)
        .post('/snacks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${uniquePrefix}_NegativeQty`,
          category: 'SWEET',
          quantity: -5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('Rejects negative threshold with 400', async () => {
      const res = await request(app)
        .post('/snacks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${uniquePrefix}_NegativeThresh`,
          category: 'DRINK',
          quantity: 10,
          lowStockThreshold: -1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('Rejects invalid category with 400', async () => {
      const res = await request(app)
        .post('/snacks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${uniquePrefix}_BadCategory`,
          category: 'INVALID_CATEGORY_XYZ',
          quantity: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('Rejects duplicate snack name with 409 Conflict', async () => {
      const res = await request(app)
        .post('/snacks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${uniquePrefix}_Almond_Bar`, // Duplicate
          category: 'SWEET',
          quantity: 10,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toHaveProperty('code', 'CONFLICT');
    });
  });

  // ==========================================
  // 2. GET /snacks (Filtering, Search, Pagination)
  // ==========================================
  describe('GET /snacks', () => {
    it('Returns paginated list of snacks with derived status', async () => {
      const res = await request(app).get('/snacks?page=1&limit=8');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.pagination.limit).toBe(8);
      expect(res.body.data.items.length).toBeLessThanOrEqual(8);

      const item = res.body.data.items[0];
      expect(item).toHaveProperty('status');
      expect(['STOCKED', 'RUNNING_LOW', 'GONE']).toContain(item.status);
    });

    it('Supports server-side search by snack name', async () => {
      const res = await request(app).get(`/snacks?search=${uniquePrefix}_Almond_Bar`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].name).toBe(`${uniquePrefix}_Almond_Bar`);
    });

    it('Supports server-side category filtering', async () => {
      const res = await request(app).get('/snacks?category=SWEET');
      expect(res.status).toBe(200);
      for (const item of res.body.data.items) {
        expect(item.category).toBe('SWEET');
      }
    });

    it('Supports server-side status filtering (STOCKED)', async () => {
      const res = await request(app).get('/snacks?status=STOCKED');
      expect(res.status).toBe(200);
      for (const item of res.body.data.items) {
        expect(item.status).toBe('STOCKED');
        expect(item.quantity).toBeGreaterThan(item.lowStockThreshold);
      }
    });

    it('Supports server-side status filtering (RUNNING_LOW)', async () => {
      const res = await request(app).get('/snacks?status=RUNNING_LOW');
      expect(res.status).toBe(200);
      for (const item of res.body.data.items) {
        expect(item.status).toBe('RUNNING_LOW');
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.quantity).toBeLessThanOrEqual(item.lowStockThreshold);
      }
    });

    it('Supports server-side status filtering (GONE)', async () => {
      const res = await request(app).get('/snacks?status=GONE');
      expect(res.status).toBe(200);
      for (const item of res.body.data.items) {
        expect(item.status).toBe('GONE');
        expect(item.quantity).toBe(0);
      }
    });

    it('Rejects invalid query parameters with 400', async () => {
      const res = await request(app).get('/snacks?page=-1');
      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  // ==========================================
  // 3. GET /snacks/:id
  // ==========================================
  describe('GET /snacks/:id', () => {
    it('Returns single snack by ID with vote count', async () => {
      const res = await request(app).get(`/snacks/${createdSnackId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdSnackId);
      expect(res.body.data).toHaveProperty('voteCount');
      expect(res.body.data).toHaveProperty('status');
    });

    it('Returns 404 for non-existent snack ID', async () => {
      const res = await request(app).get('/snacks/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  // ==========================================
  // 4. PATCH /snacks/:id (Admin Only)
  // ==========================================
  describe('PATCH /snacks/:id', () => {
    it('Admin can update snack information', async () => {
      const res = await request(app)
        .patch(`/snacks/${createdSnackId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${uniquePrefix}_Almond_Bar_Renamed`,
          lowStockThreshold: 8,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(`${uniquePrefix}_Almond_Bar_Renamed`);
      expect(res.body.data.lowStockThreshold).toBe(8);
    });

    it('Member is forbidden from updating snack (403)', async () => {
      const res = await request(app)
        .patch(`/snacks/${createdSnackId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Hacked_Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });

    it('Rejects invalid field update with 400', async () => {
      const res = await request(app)
        .patch(`/snacks/${createdSnackId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity: -10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('Returns 404 when updating non-existent snack', async () => {
      const res = await request(app)
        .patch('/snacks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Name',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  // ==========================================
  // 5. DELETE /snacks/:id (Admin Only)
  // ==========================================
  describe('DELETE /snacks/:id', () => {
    it('Member is forbidden from deleting snack (403)', async () => {
      const res = await request(app)
        .delete(`/snacks/${createdSnackId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });

    it('Admin can safely delete snack and handles activities/votes consistently', async () => {
      // 1. First add a vote and consume activity to test cascade/consistency
      await request(app)
        .post(`/snacks/${createdSnackId}/vote`)
        .set('Authorization', `Bearer ${memberToken}`);

      await request(app)
        .post(`/snacks/${createdSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 1 });

      // 2. Delete snack
      const res = await request(app)
        .delete(`/snacks/${createdSnackId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);

      // 3. Confirm deletion
      const checkRes = await request(app).get(`/snacks/${createdSnackId}`);
      expect(checkRes.status).toBe(404);
    });

    it('Returns 404 when deleting already non-existent snack', async () => {
      const res = await request(app)
        .delete('/snacks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});

