import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import prisma from '../src/config/database';
import { config } from '../src/config/env';

const app = createApp();

describe('Authentication & Role-Based Authorization', () => {
  const testMemberEmail = `newmember_${Date.now()}@snackoverflow.com`;
  let memberToken: string;
  let adminToken: string;

  // 1. Successful Admin Login
  it('POST /api/auth/login - Admin Login with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@snackoverflow.com',
      password: 'Admin@123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('role', 'ADMIN');
    expect(res.body.data.user).not.toHaveProperty('password'); // Password hash must never be returned

    adminToken = res.body.data.token;
  });

  // 2. Successful Member Login
  it('POST /api/auth/login - Member Login with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@snackoverflow.com',
      password: 'Member@123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('role', 'MEMBER');
    expect(res.body.data.user).not.toHaveProperty('password');

    memberToken = res.body.data.token;
  });

  // 3. Invalid credentials - wrong password
  it('POST /api/auth/login - should fail with 401 when password is wrong', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@snackoverflow.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
  });

  // 4. Invalid credentials - non-existent email
  it('POST /api/auth/login - should fail with 401 when email does not exist', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost_user@snackoverflow.com',
      password: 'AnyPassword123',
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
  });

  // 5. Successful Member Signup
  it('POST /api/auth/signup - should register new MEMBER account', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test New Member',
      email: testMemberEmail,
      password: 'SecurePassword123!',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data.user).toHaveProperty('role', 'MEMBER');
    expect(res.body.data.user).toHaveProperty('email', testMemberEmail);
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.body.data).toHaveProperty('token');
  });

  // 6. Duplicate Email Registration
  it('POST /api/auth/signup - should reject duplicate email with 409 Conflict', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Duplicate Member',
      email: testMemberEmail,
      password: 'AnotherPassword123!',
    });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'EMAIL_ALREADY_EXISTS');
  });

  // 7. Security: Public signup attempting to assign ADMIN role must be rejected or forced to MEMBER
  it('POST /api/auth/signup - must NEVER allow public registration of ADMIN role', async () => {
    const exploitEmail = `exploit_attempt_${Date.now()}@snackoverflow.com`;
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Hacker User',
      email: exploitEmail,
      password: 'HackedPassword123!',
      role: 'ADMIN', // Malicious attempt to self-assign ADMIN
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toHaveProperty('role', 'MEMBER'); // Must be strictly MEMBER!

    // Verify in database as well
    const saved = await prisma.user.findUnique({ where: { email: exploitEmail } });
    expect(saved?.role).toBe('MEMBER');
  });

  // 8. Missing Token on Protected Route
  it('GET /api/auth/me - should return 401 when token is missing', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  // 9. Invalid Token
  it('GET /api/auth/me - should return 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_garbage_token_string');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'INVALID_TOKEN');
  });

  // 10. Expired Token
  it('GET /api/auth/me - should return 401 when token has expired', async () => {
    // Generate token that expired 1 hour ago
    const expiredToken = jwt.sign(
      { userId: 'test-id', role: 'MEMBER', email: 'expired@test.com' },
      config.jwtSecret,
      { expiresIn: '-1h' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'TOKEN_EXPIRED');
  });

  // 11. Member attempting Admin-Only operation
  it('GET /api/admin/dashboard - Member should receive 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  // 12. Admin successfully accessing Admin-Only operation
  it('GET /api/admin/dashboard - Admin should receive 200 OK', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('stats');
  });
});
