// AUTH / SECURITY — login, identity, token rejection, role enforcement.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seedStudent(dept) {
  const user = await createUser({ name: 'Auth Student', role: 'STUDENT', department: dept._id });
  return user;
}

describe('auth', () => {
  test('register succeeds and returns token + identity', async () => {
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
    expect(typeof res.body.token).toBe('string');
    expect(res.body.data.role).toBe('STUDENT');
    expect(res.body.data.email).toBe('fresh@test.com');
    expect(res.body.data.password).toBeUndefined();
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
    expect([400, 500]).toContain(second.status);
    expect(second.body.success).toBe(false);
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
