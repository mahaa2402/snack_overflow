/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Pantry Activity Timeline, Insights & Smart Restock API Tests', () => {
  let adminToken: string;
  let adminId: string;
  let memberToken: string;
  let memberId: string;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@snackoverflow.com',
      password: 'Admin@123',
    });
    adminToken = adminRes.body.data.token;
    adminId = adminRes.body.data.user.id;

    // 2. Authenticate Member
    const memberRes = await request(app).post('/api/auth/login').send({
      email: 'priya@snackoverflow.com',
      password: 'Member@123',
    });
    memberToken = memberRes.body.data.token;
    memberId = memberRes.body.data.user.id;
  });

  // ==========================================
  // FEATURE 1: ADMIN ACTIVITY TIMELINE AND PERSONAL GRAB HISTORY
  // ==========================================
  describe('Pantry activity access', () => {
    it('Admins can access the global activity timeline', async () => {
      const res = await request(app)
        .get('/api/admin/activities')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const item = res.body.data[0];
      expect(item).toHaveProperty('id');
      expect(['CONSUMED', 'RESTOCKED']).toContain(item.action);
      expect(item).toHaveProperty('amount');
      expect(item).toHaveProperty('createdAt');
      expect(item.user).toHaveProperty('name');
      expect(item.user).not.toHaveProperty('password');
      expect(item.snack).toHaveProperty('name');
    });

    it('Members can access only their own consumed snack history', async () => {
      const res = await request(app)
        .get('/api/activities/me')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const act of res.body.data) {
        expect(act.action).toBe('CONSUMED');
        expect(act.user.id).toBe(memberId);
      }
    });

    it('Returns personal pantry metrics, trends, recap, favourites, and activity', async () => {
      const res = await request(app)
        .get('/api/activities/me/dashboard')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const dashboard = res.body.data;
      expect(dashboard.overview).toEqual(
        expect.objectContaining({
          totalConsumed: expect.any(Number),
          totalVotes: expect.any(Number),
          activeDays: expect.any(Number),
        })
      );
      expect(dashboard).toHaveProperty('overview.favouriteSnack');
      expect(dashboard.favouriteSnacks).toEqual(expect.any(Array));
      expect(dashboard.weeklyConsumption).toHaveLength(7);
      expect(dashboard.monthlyConsumption).toHaveLength(6);
      expect(dashboard.monthlyRecap).toEqual(
        expect.objectContaining({
          consumed: expect.any(Number),
          previousMonthConsumed: expect.any(Number),
          activeDays: expect.any(Number),
        })
      );
      expect(dashboard.timeline).toEqual(expect.any(Array));
      for (const event of dashboard.timeline) {
        expect(['CONSUMED', 'VOTED']).toContain(event.type);
        expect(event.snackName).toEqual(expect.any(String));
      }

      const withAnotherUserId = await request(app)
        .get(`/api/activities/me/dashboard?userId=${adminId}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(withAnotherUserId.status).toBe(200);
      expect(withAnotherUserId.body.data.overview).toEqual(dashboard.overview);
      expect(withAnotherUserId.body.data.timeline).toEqual(dashboard.timeline);
    });

    it('Members cannot access the global activity timeline', async () => {
      for (const path of ['/api/activities', '/api/snacks/activities']) {
        const res = await request(app)
          .get(path)
          .set('Authorization', `Bearer ${memberToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
      }
    });

    it('Unauthenticated requests to activity endpoints are rejected with 401', async () => {
      const res = await request(app).get('/api/activities');
      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // ==========================================
  // FEATURE 2: PANTRY INSIGHTS (GET /api/admin/insights)
  // ==========================================
  describe('GET /api/admin/insights (Feature 2: Analytics & Feature 3: Smart Restock)', () => {
    it('Admin can retrieve comprehensive pantry insights and analytics', async () => {
      const res = await request(app)
        .get('/api/admin/insights')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);

      const insights = res.body.data;

      // 1. KPIs
      expect(insights).toHaveProperty('kpis');
      expect(insights.kpis).toHaveProperty('mostConsumedSnack');
      expect(insights.kpis).toHaveProperty('mostVotedSnack');
      expect(insights.kpis).toHaveProperty('totalConsumedThisWeek');
      expect(insights.kpis).toHaveProperty('totalConsumedLastWeek');
      expect(insights.kpis).toHaveProperty('weeklyConsumptionGrowth');

      if (insights.kpis.mostConsumedSnack) {
        expect(insights.kpis.mostConsumedSnack).toHaveProperty('name');
        expect(insights.kpis.mostConsumedSnack).toHaveProperty('totalConsumed');
        expect(insights.kpis.mostConsumedSnack).toHaveProperty('status');
      }

      if (insights.kpis.mostVotedSnack) {
        expect(insights.kpis.mostVotedSnack).toHaveProperty('name');
        expect(insights.kpis.mostVotedSnack).toHaveProperty('voteCount');
      }

      // 2. Consumption Trends
      expect(insights).toHaveProperty('consumptionTrends');
      expect(insights.consumptionTrends).toHaveProperty('daily');
      expect(Array.isArray(insights.consumptionTrends.daily)).toBe(true);
      expect(insights.consumptionTrends.daily.length).toBe(7); // 7-day trend
      expect(insights.consumptionTrends.daily[0]).toHaveProperty('dayLabel');
      expect(insights.consumptionTrends.daily[0]).toHaveProperty('consumed');
      expect(insights.consumptionTrends.daily[0]).toHaveProperty('restocked');

      // 3. Category Breakdown
      expect(insights).toHaveProperty('categoryBreakdown');
      expect(Array.isArray(insights.categoryBreakdown)).toBe(true);
      const categories = insights.categoryBreakdown.map((c: { category: string }) => c.category);
      expect(categories).toContain('SWEET');
      expect(categories).toContain('SAVOURY');
      expect(categories).toContain('DRINK');
      expect(categories).toContain('HEALTHY_ISH');

      // 4. Top Consumed Leaderboard
      expect(insights).toHaveProperty('topConsumedSnacks');
      expect(Array.isArray(insights.topConsumedSnacks)).toBe(true);
      if (insights.topConsumedSnacks.length > 0) {
        expect(insights.topConsumedSnacks[0]).toHaveProperty('burnRatePerDay');
      }

      // 5. Smart Restock Suggestions (Feature 3)
      expect(insights).toHaveProperty('restockSuggestions');
      expect(Array.isArray(insights.restockSuggestions)).toBe(true);
      for (const suggestion of insights.restockSuggestions) {
        expect(suggestion).toHaveProperty('snackId');
        expect(suggestion).toHaveProperty('snackName');
        expect(suggestion).toHaveProperty('currentQuantity');
        expect(suggestion).toHaveProperty('suggestedRestockAmount');
        expect(suggestion.suggestedRestockAmount).toBeGreaterThan(0);
        expect(['CRITICAL', 'URGENT', 'PREVENTATIVE']).toContain(suggestion.urgency);
        expect(suggestion).toHaveProperty('reasoning');
        expect(typeof suggestion.reasoning).toBe('string');
      }
    });

    it('Member cannot access admin insights (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/insights')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });

    it('Unauthenticated user cannot access admin insights (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/admin/insights');

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });
});
