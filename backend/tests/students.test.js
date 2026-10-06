// STUDENTS / FACULTY / ADMIN — profiles, ownership, management permissions.
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, createFaculty, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

describe('students / faculty / admin', () => {
  test('admin can create a student; forged role field is ignored', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const res = await request(app).post('/api/v1/students').set(authHeader(admin)).send({
      name: 'Fresh Student', email: 'freshstud@test.com', password: 'Passw0rd!',
      usn: 'FORGED0001', department: String(dept._id), semester: 2,
      role: 'ADMIN', // forged privilege — must be ignored
    });
    expect(res.status).toBe(201);
    const created = await User.findOne({ email: 'freshstud@test.com' });
    expect(created.role).toBe('STUDENT');
  });

  test('non-admin cannot create students; validation rejects bad payload', async () => {
    const dept = await createDepartment();
    const { user } = await createStudent({ department: dept });
    const forbidden = await request(app).post('/api/v1/students').set(authHeader(user)).send({
      name: 'X', email: 'x@test.com', password: 'Passw0rd!',
      usn: 'XXX0000002', department: String(dept._id), semester: 1,
    });
    expect(forbidden.status).toBe(403);

    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const bad = await request(app).post('/api/v1/students').set(authHeader(admin)).send({
      name: 'X', email: 'not-an-email', password: 'Passw0rd!',
      usn: 'x', department: 'not-an-id', semester: 99,
    });
    expect(bad.status).toBe(400);
  });

  test('student reads own profile; profile has no secrets', async () => {
    const dept = await createDepartment();
    const { user, profile } = await createStudent({ department: dept });
    const res = await request(app).get('/api/v1/students/me').set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.data.usn).toBe(profile.usn);
    expect(JSON.stringify(res.body)).not.toContain('Passw0rd');
  });

  test('faculty reads own profile; admin can list faculty; student cannot', async () => {
    const dept = await createDepartment();
    const { user: facUser } = await createFaculty({ department: dept });
    const me = await request(app).get('/api/v1/faculty/me').set(authHeader(facUser));
    expect(me.status).toBe(200);

    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const list = await request(app).get('/api/v1/faculty').set(authHeader(admin));
    expect(list.status).toBe(200);

    const { user: stud } = await createStudent({ department: dept });
    const denied = await request(app).get('/api/v1/faculty').set(authHeader(stud));
    expect(denied.status).toBe(403);
  });

  test('admin-only faculty creation; malformed id on update', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const created = await request(app).post('/api/v1/faculty').set(authHeader(admin)).send({
      name: 'New Fac', email: 'newfac@test.com', password: 'Passw0rd!',
      employeeId: 'EMP100', department: String(dept._id), designation: 'Lecturer',
      qualification: 'M.Tech', experience: 5, dateOfJoining: '2023-01-15',
    });
    expect(created.status).toBe(201);

    const badId = await request(app).put('/api/v1/faculty/not-an-id').set(authHeader(admin)).send({ designation: 'Prof' });
    expect([400, 404, 500]).toContain(badId.status);
    // Must never leak a stack trace or succeed
    expect(badId.body.success).not.toBe(true);
  });
});
