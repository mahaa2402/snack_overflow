/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/database';

const app = createApp();

describe('Voting Correctness & Authorization Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let testSnackId: string;

  beforeAll(async () => {
    // 1. Authenticate Alice (User A)
    const resA = await request(app).post('/api/auth/login').send({
      email: 'priya@snackoverflow.com',
      password: 'Member@123',
    });
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.id;

    // 2. Authenticate Bob (User B)
    const resB = await request(app).post('/api/auth/login').send({
      email: 'rekha@snackoverflow.com',
      password: 'Member@123',
    });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.id;

    // 3. Create a dedicated test snack for voting tests
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@snackoverflow.com',
      password: 'Admin@123',
    });
    const adminToken = adminRes.body.data.token;

    const snackRes = await request(app)
      .post('/snacks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `VoteTest_Snack_${Date.now()}`,
        category: 'DRINK',
        quantity: 10,
        lowStockThreshold: 2,
      });

    testSnackId = snackRes.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testSnackId) {
      await prisma.vote.deleteMany({ where: { snackId: testSnackId } });
      await prisma.activity.deleteMany({ where: { snackId: testSnackId } });
      await prisma.snack.deleteMany({ where: { id: testSnackId } });
    }
  });

  // 1. One user cannot vote twice for the same snack
  it('One user cannot vote twice for the same snack (API & Database constraint)', async () => {
    // First vote by User A
    const firstVoteRes = await request(app)
      .post(`/snacks/${testSnackId}/vote`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ action: 'vote' });

    expect(firstVoteRes.status).toBe(200);
    expect(firstVoteRes.body.data.hasVoted).toBe(true);
    expect(firstVoteRes.body.data.voteCount).toBe(1);

    // Second vote attempt by User A with action 'vote' must be rejected with 409
    const secondVoteRes = await request(app)
      .post(`/snacks/${testSnackId}/vote`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ action: 'vote' });

    expect(secondVoteRes.status).toBe(409);
    expect(secondVoteRes.body.error).toHaveProperty('code', 'ALREADY_VOTED');

    // Verify at database level: attempting duplicate insert fails unique constraint
    await expect(
      prisma.vote.create({
        data: {
          userId: userAId,
          snackId: testSnackId,
        },
      })
    ).rejects.toThrow();

    // Verify database count is still exactly 1
    const dbCount = await prisma.vote.count({ where: { snackId: testSnackId } });
    expect(dbCount).toBe(1);
  });

  // 2. Different users can vote for the same snack
  it('Different users can vote for the same snack', async () => {
    // User B votes for the same snack
    const resB = await request(app)
      .post(`/snacks/${testSnackId}/vote`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ action: 'vote' });

    expect(resB.status).toBe(200);
    expect(resB.body.data.hasVoted).toBe(true);
    expect(resB.body.data.voteCount).toBe(2);

    // Verify in database: two distinct vote rows exist
    const votesInDb = await prisma.vote.findMany({
      where: { snackId: testSnackId },
    });
    expect(votesInDb).toHaveLength(2);
    const voterIds = votesInDb.map((v) => v.userId);
    expect(voterIds).toContain(userAId);
    expect(voterIds).toContain(userBId);
  });

  // 3. Users cannot remove another user's vote
  it("Users cannot remove another user's vote", async () => {
    // Find User A's vote ID
    const userAVote = await prisma.vote.findUnique({
      where: {
        userId_snackId: {
          userId: userAId,
          snackId: testSnackId,
        },
      },
    });
    expect(userAVote).not.toBeNull();

    // User B tries to delete User A's vote by vote ID -> must fail with 403
    const crossDeleteRes = await request(app)
      .delete(`/votes/${userAVote!.id}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(crossDeleteRes.status).toBe(403);
    expect(crossDeleteRes.body.error).toHaveProperty('code', 'FORBIDDEN');

    // User B tries to delete User A's vote via snack route by spoofing targetUserId -> must fail with 403
    const crossDeleteSnackRes = await request(app)
      .delete(`/snacks/${testSnackId}/vote`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ userId: userAId });

    expect(crossDeleteSnackRes.status).toBe(403);
    expect(crossDeleteSnackRes.body.error).toHaveProperty('code', 'FORBIDDEN');

    // Verify User A's vote is still intact in the database
    const voteStillExists = await prisma.vote.findUnique({
      where: { id: userAVote!.id },
    });
    expect(voteStillExists).not.toBeNull();
  });

  // 4. Users can remove their own votes
  it('Users can remove their own votes', async () => {
    // User A removes their own vote via DELETE /snacks/:id/vote
    const deleteRes = await request(app)
      .delete(`/snacks/${testSnackId}/vote`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.hasVoted).toBe(false);
    expect(deleteRes.body.data.voteCount).toBe(1); // User B's vote remains

    // Verify in database: User A's vote is gone
    const userAVoteInDb = await prisma.vote.findUnique({
      where: {
        userId_snackId: {
          userId: userAId,
          snackId: testSnackId,
        },
      },
    });
    expect(userAVoteInDb).toBeNull();

    // User B's vote is still present
    const userBVoteInDb = await prisma.vote.findUnique({
      where: {
        userId_snackId: {
          userId: userBId,
          snackId: testSnackId,
        },
      },
    });
    expect(userBVoteInDb).not.toBeNull();

    // User B removes their own vote via DELETE /votes/:id
    const deleteUserBRes = await request(app)
      .delete(`/votes/${userBVoteInDb!.id}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(deleteUserBRes.status).toBe(200);

    // Verify final count is 0
    const finalCount = await prisma.vote.count({ where: { snackId: testSnackId } });
    expect(finalCount).toBe(0);
  });
});

