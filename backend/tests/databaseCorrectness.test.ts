/// <reference types="jest" />
import prisma from '../src/config/database';

describe('PostgreSQL Database Integrity & Constraint Verification', () => {
  const runId = Date.now();
  let testUserId: string;
  let testSnackId: string;

  beforeAll(async () => {
    // Create base user and snack for relational integrity tests
    const user = await prisma.user.create({
      data: {
        name: `DbTest User ${runId}`,
        email: `dbtest_${runId}@snackoverflow.com`,
        password: '$2b$10$hashedPasswordPlaceholderForDbTest123',
        role: 'MEMBER',
      },
    });
    testUserId = user.id;

    const snack = await prisma.snack.create({
      data: {
        name: `DbTest Snack ${runId}`,
        category: 'SWEET',
        quantity: 10,
        lowStockThreshold: 3,
      },
    });
    testSnackId = snack.id;
  });

  afterAll(async () => {
    // Cleanup test data safely
    try {
      await prisma.vote.deleteMany({ where: { snackId: testSnackId } });
      await prisma.activity.deleteMany({ where: { snackId: testSnackId } });
      await prisma.snack.deleteMany({ where: { id: testSnackId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch {
      // Ignore cleanup error if already removed
    }
  });

  // ==========================================
  // 1. UNIQUE CONSTRAINTS
  // ==========================================
  describe('Database Unique Constraints', () => {
    it('enforces UNIQUE constraint on users.email', async () => {
      await expect(
        prisma.user.create({
          data: {
            name: 'Duplicate Email Attempt',
            email: `dbtest_${runId}@snackoverflow.com`, // Duplicate
            password: 'password123',
          },
        })
      ).rejects.toThrow();
    });

    it('enforces UNIQUE constraint on snacks.name', async () => {
      await expect(
        prisma.snack.create({
          data: {
            name: `DbTest Snack ${runId}`, // Duplicate
            category: 'SWEET',
            quantity: 5,
          },
        })
      ).rejects.toThrow();
    });

    it('enforces composite UNIQUE constraint on votes(userId, snackId)', async () => {
      // Create initial vote
      await prisma.vote.create({
        data: {
          userId: testUserId,
          snackId: testSnackId,
        },
      });

      // Attempting duplicate vote must fail database unique constraint
      await expect(
        prisma.vote.create({
          data: {
            userId: testUserId,
            snackId: testSnackId,
          },
        })
      ).rejects.toThrow();

      // Clean up vote for subsequent tests
      await prisma.vote.deleteMany({ where: { snackId: testSnackId } });
    });
  });

  // ==========================================
  // 2. FOREIGN KEY CONSTRAINTS
  // ==========================================
  describe('Database Foreign Key Constraints', () => {
    const invalidId = '00000000-0000-0000-0000-000000000000';

    it('rejects Vote insertion with non-existent userId', async () => {
      await expect(
        prisma.vote.create({
          data: {
            userId: invalidId,
            snackId: testSnackId,
          },
        })
      ).rejects.toThrow();
    });

    it('rejects Vote insertion with non-existent snackId', async () => {
      await expect(
        prisma.vote.create({
          data: {
            userId: testUserId,
            snackId: invalidId,
          },
        })
      ).rejects.toThrow();
    });

    it('rejects Activity insertion with non-existent userId', async () => {
      await expect(
        prisma.activity.create({
          data: {
            userId: invalidId,
            snackId: testSnackId,
            action: 'CONSUMED',
            amount: 1,
          },
        })
      ).rejects.toThrow();
    });

    it('rejects Activity insertion with non-existent snackId', async () => {
      await expect(
        prisma.activity.create({
          data: {
            userId: testUserId,
            snackId: invalidId,
            action: 'CONSUMED',
            amount: 1,
          },
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================
  // 3. POSTGRESQL CHECK CONSTRAINTS
  // ==========================================
  describe('PostgreSQL Storage-Level CHECK Constraints', () => {
    it('enforces CHECK constraint "snack_quantity_non_negative" (quantity >= 0)', async () => {
      // Direct raw SQL update attempting to set quantity to negative value
      await expect(
        prisma.$executeRaw`
          UPDATE "snacks"
          SET "quantity" = -5
          WHERE "id" = ${testSnackId}
        `
      ).rejects.toThrow(/snack_quantity_non_negative|check constraint/i);

      // Verify quantity was not corrupted
      const current = await prisma.snack.findUnique({ where: { id: testSnackId } });
      expect(current?.quantity).toBe(10);
    });

    it('enforces CHECK constraint "activity_amount_positive" (amount > 0)', async () => {
      const actIdZero = `act_zero_${runId}`;
      const actIdNeg = `act_neg_${runId}`;

      // Amount = 0 must fail check constraint
      await expect(
        prisma.$executeRaw`
          INSERT INTO "activities" ("id", "userId", "snackId", "action", "amount", "createdAt")
          VALUES (${actIdZero}, ${testUserId}, ${testSnackId}, 'CONSUMED', 0, NOW())
        `
      ).rejects.toThrow(/activity_amount_positive|check constraint/i);

      // Amount < 0 must fail check constraint
      await expect(
        prisma.$executeRaw`
          INSERT INTO "activities" ("id", "userId", "snackId", "action", "amount", "createdAt")
          VALUES (${actIdNeg}, ${testUserId}, ${testSnackId}, 'CONSUMED', -3, NOW())
        `
      ).rejects.toThrow(/activity_amount_positive|check constraint/i);
    });
  });

  // ==========================================
  // 4. DATABASE INDEXES VERIFICATION
  // ==========================================
  describe('PostgreSQL Index Catalog Verification', () => {
    it('verifies all critical indexes exist in the PostgreSQL schema', async () => {
      const indexes = await prisma.$queryRaw<Array<{ indexname: string; tablename: string }>>`
        SELECT tablename, indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `;

      const indexNames = indexes.map((i) => i.indexname);

      // Users unique index
      expect(indexNames).toContain('users_email_key');

      // Snacks unique & lookup indexes
      expect(indexNames).toContain('snacks_name_key');
      expect(indexNames).toContain('snacks_category_idx');

      // Votes indexes
      expect(indexNames).toContain('votes_userId_snackId_key');
      expect(indexNames).toContain('votes_userId_idx');
      expect(indexNames).toContain('votes_snackId_idx');

      // Activities indexes
      expect(indexNames).toContain('activities_userId_idx');
      expect(indexNames).toContain('activities_snackId_idx');
      expect(indexNames).toContain('activities_createdAt_idx');
    });
  });
});

