// AUTH / SECURITY — login, identity, token rejection, role enforcement.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seedStudent(dept) {
  const user = await createUser({ name: 'Auth Student', role: 'STUDENT', department: dept._id, isEmailVerified: true });
  return user;
}

describe('auth', () => {
  test('register succeeds and creates unverified account (no token issued)', async () => {
    const dept = await createDepartment();
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'New Student',
      email: 'fresh@test.com',
      password: 'Passw0rd!',
      role: 'STUDENT',
      department: String(dept._id),
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.verified).toBe(false);
    expect(res.body.token).toBeUndefined();
    expect(res.body.message.toLowerCase()).toContain('verif');

    const User = require('../src/models/User');
    const user = await User.findOne({ email: 'fresh@test.com' });
    expect(user).toBeTruthy();
    expect(user.isEmailVerified).toBe(false);
    expect(user.emailVerificationToken).toBeDefined();
    expect(user.emailVerificationExpire).toBeDefined();
  });

  test('register rejects weak password and duplicate email', async () => {
    const dept = await createDepartment();
    const weak = await request(app).post('/api/v1/auth/register').send({
      name: 'Weak', email: 'weak@test.com', password: 'short',
      role: 'STUDENT', department: String(dept._id),
    });
    expect(weak.status).toBe(400);

    const payload = {
      name: 'Dup', email: 'dup@test.com', password: 'Passw0rd!',
      role: 'STUDENT', department: String(dept._id),
    };
    const first = await request(app).post('/api/v1/auth/register').send(payload);
    expect(first.status).toBe(201);
    const second = await request(app).post('/api/v1/auth/register').send(payload);
    expect(second.status).toBe(400);
    expect(second.body.success).toBe(false);
    expect(second.body.error).toBe('Email already registered');
  });

  test('register rejects weak password and duplicate email', async () => {
    const dept = await createDepartment();
    const weak = await request(app).post('/api/v1/auth/register').send({
      name: 'Weak', email: 'weak@test.com', password: 'short',
      role: 'STUDENT', department: String(dept._id),
    });
    expect(weak.status).toBe(400);

    const payload = {
      name: 'Dup', email: 'dup@test.com', password: 'Passw0rd!',
      role: 'STUDENT', department: String(dept._id),
    };
    const first = await request(app).post('/api/v1/auth/register').send(payload);
    expect(first.status).toBe(201);
    const second = await request(app).post('/api/v1/auth/register').send(payload);
    expect(second.status).toBe(400);
    expect(second.body.success).toBe(false);
    expect(second.body.error).toBe('Email already registered');
  });

  test('student self-registration creates User + linked Student profile', async () => {
    const dept = await createDepartment();
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Reg Student',
      email: 'regstudent@test.com',
      password: 'Passw0rd!',
      role: 'STUDENT',
      department: String(dept._id),
      usn: 'REG001',
      semester: 3,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.verified).toBe(false);

    const Student = require('../src/models/Student');
    const profile = await Student.findOne({ usn: 'REG001' });
    expect(profile).toBeTruthy();
    expect(profile.semester).toBe(3);
    expect(profile.department.toString()).toBe(dept._id.toString());

    const User = require('../src/models/User');
    const user = await User.findOne({ email: 'regstudent@test.com' });
    expect(profile.userId.toString()).toBe(user._id.toString());
  });

  test('student self-registration enforces USN uniqueness', async () => {
    const dept = await createDepartment();
    await request(app).post('/api/v1/auth/register').send({
      name: 'First', email: 'first@test.com', password: 'Passw0rd!',
      role: 'STUDENT', department: String(dept._id), usn: 'DUP001', semester: 2,
    });
    const second = await request(app).post('/api/v1/auth/register').send({
      name: 'Second', email: 'second@test.com', password: 'Passw0rd!',
      role: 'STUDENT', department: String(dept._id), usn: 'dup001', semester: 2,
    });
    expect(second.status).toBe(400);
    expect(second.body.success).toBe(false);
    expect(second.body.error).toBe('USN already registered');
  });

  test('student self-registration without department is rejected', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'No Dept', email: 'nodept@test.com', password: 'Passw0rd!',
      role: 'STUDENT', usn: 'NODEPT', semester: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('public registration cannot create ADMIN or FACULTY accounts', async () => {
    const dept = await createDepartment();
    const admin = await request(app).post('/api/v1/auth/register').send({
      name: 'Evil', email: 'evil@test.com', password: 'Passw0rd!',
      role: 'ADMIN', department: String(dept._id),
    });
    expect(admin.status).toBe(403);

    const faculty = await request(app).post('/api/v1/auth/register').send({
      name: 'Evil2', email: 'evil2@test.com', password: 'Passw0rd!',
      role: 'FACULTY', department: String(dept._id),
    });
    expect(faculty.status).toBe(403);
  });

  test('login succeeds with correct credentials, fails otherwise', async () => {
    const dept = await createDepartment();
    const user = await seedStudent(dept);
    const ok = await request(app).post('/api/v1/auth/login').send({
      email: user.email, password: 'Passw0rd!',
    });
    expect(ok.status).toBe(200);
    expect(typeof ok.body.token).toBe('string');

    const badPass = await request(app).post('/api/v1/auth/login').send({
      email: user.email, password: 'Wrongpass1!',
    });
    expect(badPass.status).toBe(401);

    const unknown = await request(app).post('/api/v1/auth/login').send({
      email: 'nobody@test.com', password: 'Passw0rd!',
    });
    expect(unknown.status).toBe(401);
  });

  test('/auth/me returns identity incl. student extras, no secrets', async () => {
    const dept = await createDepartment();
    const { profile } = await createStudent({ department: dept });
    const owner = await User.findById(profile.userId);
    owner.isEmailVerified = true;
    await owner.save();
    const res = await request(app).get('/api/v1/auth/me').set(authHeader(owner));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBeDefined();
    expect(res.body.data.role).toBe('STUDENT');
    expect(res.body.data.usn).toBe(profile.usn);
    expect(res.body.data.semester).toBe(profile.semester);
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.twoFactorSecret).toBeUndefined();
  });

  test('missing token -> 401, garbage token -> 401', async () => {
    const noToken = await request(app).get('/api/v1/auth/me');
    expect(noToken.status).toBe(401);

    const garbage = await request(app).get('/api/v1/auth/me')
      .set({ Authorization: 'Bearer not.a.real.token' });
    expect(garbage.status).toBe(401);
  });

  test('expired token is rejected', async () => {
    const dept = await createDepartment();
    const user = await seedStudent(dept);
    const expired = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '-10s' });
    const res = await request(app).get('/api/v1/auth/me')
      .set({ Authorization: `Bearer ${expired}` });
    expect(res.status).toBe(401);
  });

  test('role enforcement: student cannot reach admin route', async () => {
    const dept = await createDepartment();
    const user = await seedStudent(dept);
    const res = await request(app).get('/api/v1/admin/analytics').set(authHeader(user));
    expect(res.status).toBe(403);
  });

  test('logout invalidates the token (blacklist)', async () => {
    const dept = await createDepartment();
    const user = await seedStudent(dept);
    const login = await request(app).post('/api/v1/auth/login').send({
      email: user.email, password: 'Passw0rd!',
    });
    const token = login.body.token;
    const out = await request(app).get('/api/v1/auth/logout')
      .set({ Authorization: `Bearer ${token}` });
    expect(out.status).toBe(200);
    const reused = await request(app).get('/api/v1/auth/me')
      .set({ Authorization: `Bearer ${token}` });
    expect(reused.status).toBe(401);
  });
});

describe('email verification gate', () => {
  test('new student registration starts unverified (no token)', async () => {
    const dept = await createDepartment();
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Unverified Student',
      email: 'unverified.student@test.com',
      password: 'Passw0rd!',
      role: 'STUDENT',
      department: String(dept._id),
      usn: 'UNV001',
      semester: 3,
    });
    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(false);
    expect(res.body.token).toBeUndefined();

    const User = require('../src/models/User');
    const user = await User.findOne({ email: 'unverified.student@test.com' });
    expect(user.isEmailVerified).toBe(false);
  });

  test('new parent registration starts unverified (no token)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Unverified Parent',
      email: 'unverified.parent@test.com',
      password: 'Passw0rd!',
      role: 'PARENT',
    });
    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(false);
    expect(res.body.token).toBeUndefined();

    const User = require('../src/models/User');
    const user = await User.findOne({ email: 'unverified.parent@test.com' });
    expect(user.isEmailVerified).toBe(false);
    expect(user.linkedStudentId).toBeNull();
  });

  test('unverified user cannot log in (403)', async () => {
    const dept = await createDepartment();
    await request(app).post('/api/v1/auth/register').send({
      name: 'Unverified', email: 'unverified.login@test.com',
      password: 'Passw0rd!', role: 'STUDENT', department: String(dept._id),
    });
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'unverified.login@test.com', password: 'Passw0rd!',
    });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/verification/);
    // No token issued
    expect(res.body.token).toBeUndefined();
  });

  test('valid verification token marks account verified', async () => {
    const dept = await createDepartment();
    const user = await createUser({
      name: 'To Verify', email: 'verify.me@test.com',
      password: 'Passw0rd!', role: 'STUDENT', department: dept._id,
    });

    // Capture the raw token returned by getEmailVerificationToken (the
    // DB stores only the SHA256 hash).
    const rawToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Hit the public verify-email endpoint with the raw token
    const verifyRes = await request(app).get(`/api/v1/auth/verifyemail/${rawToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    const updated = await User.findById(user._id);
    expect(updated.isEmailVerified).toBe(true);
    expect(updated.emailVerificationToken).toBeUndefined();
    expect(updated.emailVerificationExpire).toBeUndefined();
  });

  test('invalid verification token is rejected', async () => {
    const res = await request(app).get('/api/v1/auth/verifyemail/invalid.token.12345');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('already-used verification token is rejected', async () => {
    const dept = await createDepartment();
    const user = await createUser({
      name: 'One Time', email: 'onetime@test.com',
      password: 'Passw0rd!', role: 'STUDENT', department: dept._id,
    });

    const rawToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Verify once
    await request(app).get(`/api/v1/auth/verifyemail/${rawToken}`);
    const updated = await User.findById(user._id);
    expect(updated.isEmailVerified).toBe(true);
    expect(updated.emailVerificationToken).toBeUndefined();

    // Try again with same token - should fail since token is cleared
    const res = await request(app).get(`/api/v1/auth/verifyemail/${rawToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('expired verification token is rejected', async () => {
    const dept = await createDepartment();
    const user = await createUser({
      name: 'Expired', email: 'expired@test.com',
      password: 'Passw0rd!', role: 'STUDENT', department: dept._id,
    });

    // Manually set an expired token
    user.emailVerificationToken = crypto.createHash('sha256').update('expiredtoken123').digest('hex');
    user.emailVerificationExpire = new Date(Date.now() - 1000); // expired 1 second ago
    await user.save({ validateBeforeSave: false });

    const res = await request(app).get('/api/v1/auth/verifyemail/expiredtoken123');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('resend verification does not reveal account existence', async () => {
    // Non-existent email
    const nonexistent = await request(app).post('/api/v1/auth/resend-verification').send({
      email: 'doesnotexist@test.com',
    });
    expect(nonexistent.status).toBe(200);
    expect(nonexistent.body.success).toBe(true);

    // Existing unverified email
    await request(app).post('/api/v1/auth/register').send({
      name: 'Resend Me', email: 'resend@test.com',
      password: 'Passw0rd!', role: 'PARENT',
    });
    const existing = await request(app).post('/api/v1/auth/resend-verification').send({
      email: 'resend@test.com',
    });
    expect(existing.status).toBe(200);
    expect(existing.body.success).toBe(true);
    // Same response shape for both
    expect(existing.body.message).toBe(nonexistent.body.message);
  });

  test('unverified user with JWT is denied protected access', async () => {
    const dept = await createDepartment();
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Unverified JWT', email: 'unverified.jwt@test.com',
      password: 'Passw0rd!', role: 'STUDENT', department: String(dept._id),
    });
    expect(res.status).toBe(201);

    // Even though registration returned no token, simulate an old JWT
    // by signing one directly (as if issued before the gate existed)
    const User = require('../src/models/User');
    const user = await User.findOne({ email: 'unverified.jwt@test.com' });
    const jwt = require('jsonwebtoken');
    const oldToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Attempt to access a protected route (/auth/me is allowlisted for
    // unverified users, so use a genuinely protected route like /students/me)
    const meRes = await request(app).get('/api/v1/students/me').set({
      Authorization: `Bearer ${oldToken}`,
    });
    expect(meRes.status).toBe(403);
    expect(meRes.body.error).toContain('Email verification required');
  });

  test('verified user can access protected routes', async () => {
    const dept = await createDepartment();
    const user = await createUser({
      name: 'Verified User', email: 'verified@test.com',
      password: 'Passw0rd!', role: 'STUDENT', department: dept._id,
      isEmailVerified: true,
    });

    // Sign in and get a token
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'verified@test.com', password: 'Passw0rd!',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    const token = loginRes.body.token;

    // Access protected route
    const meRes = await request(app).get('/api/v1/auth/me').set({
      Authorization: `Bearer ${token}`,
    });
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.role).toBe('STUDENT');
  });
});
