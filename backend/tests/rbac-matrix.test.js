// RBAC REGRESSION MATRIX — the defect classes that previously broke modules:
// role mismatch, forged fields, enum mismatch, duplicates, filter poisoning,
// secret leakage, unauthenticated access, malformed input. Exact statuses.
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, createFaculty, createSubject, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seed() {
  const dept = await createDepartment();
  const admin = await createUser({ role: 'ADMIN', department: dept._id });
  const { user: facUser } = await createFaculty({ department: dept });
  const a = await createStudent({ department: dept, usn: 'RBAAAA0001' });
  const b = await createStudent({ department: dept, usn: 'RBABBB0002' });
  return {
    dept, admin, facUser,
    ownerA: await User.findById(a.profile.userId),
    ownerB: await User.findById(b.profile.userId),
    profileA: a.profile, profileB: b.profile,
  };
}

describe('rbac regression matrix', () => {
  test('unauthenticated access is 401 across modules', async () => {
    const paths = [
      ['get', '/api/v1/auth/me'],
      ['get', '/api/v1/students/me'],
      ['get', '/api/v1/attendance/my-summary'],
      ['get', '/api/v1/marks/my'],
      ['get', '/api/v1/exams/available'],
      ['get', '/api/v1/notices/my'],
      ['get', '/api/v1/library/my-books'],
      ['get', '/api/v1/hostel/my-room'],
      ['get', '/api/v1/fees/my'],
      ['get', '/api/v1/placements/my-applications'],
      ['get', '/api/v1/analytics/dashboard'],
      ['get', '/api/v1/reports/attendance'],
    ];
    for (const [method, url] of paths) {
      const res = await request(app)[method](url);
      expect(`${method} ${url}`).not.toBe(''); // sanity label
      expect(res.status).toBe(401);
    }
  });

  test('lowercase role cannot be persisted (enum enforces uppercase contract)', async () => {
    const dept = await createDepartment();
    await expect(createUser({ role: 'student', department: dept._id })).rejects.toThrow();
  });

  test('auth responses never leak password hashes or tokens of others', async () => {
    const dept = await createDepartment();
    const reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Leak Check', email: 'leak@test.com', password: 'Passw0rd!',
      role: 'STUDENT', department: String(dept._id),
    });
    expect(JSON.stringify(reg.body)).not.toMatch(/\$2[aby]\$/);
    expect(reg.body.data.password).toBeUndefined();

    const me = await request(app).get('/api/v1/auth/me')
      .set({ Authorization: `Bearer ${reg.body.token}` });
    expect(JSON.stringify(me.body)).not.toMatch(/\$2[aby]\$/);
  });

  test('forged identity fields in bodies cannot hijack ownership', async () => {
    const { dept, ownerA, profileB } = await seed();
    const subject = await createSubject({ department: dept });
    const Exam = require('../src/models/Exam');
    const future = new Date(Date.now() + 30 * 864e5);
    const exam = await Exam.create({
      title: 'Hijack?', subject: subject._id, department: dept._id, semester: 3,
      examDate: new Date(Date.now() + 60 * 864e5), duration: 60, maxMarks: 50,
      venue: 'H', registrationDeadline: future, fee: 0, status: 'upcoming',
    });
    // Attacker passes victim's student id + usn in the payload
    const res = await request(app).post('/api/v1/exams/register').set(authHeader(ownerA)).send({
      examId: String(exam._id),
      student: String(profileB._id),
      formData: {
        personalDetails: { name: 'Attacker', usn: 'RBAAAA0001', email: 'a@test.com', phone: '9999999999', address: 'x' },
        academicDetails: { department: 'CS', semester: 3, subjects: [] },
      },
    });
    expect(res.status).toBe(200);
    const ExamRegistration = require('../src/models/ExamRegistration');
    const created = await ExamRegistration.findById(res.body.registration._id);
    const { profileA } = await seedCheck(ownerA);
    expect(String(created.student)).toBe(String(profileA._id)); // still self
    expect(String(created.student)).not.toBe(String(profileB._id));
  });

  test('filter poisoning values are ignored or rejected, never crash', async () => {
    const { admin } = await seed();
    for (const q of ['all', 'undefined', '', 'null']) {
      const r1 = await request(app).get(`/api/v1/reports/attendance?department=${q}`).set(authHeader(admin));
      expect(r1.status).not.toBe(500);
      const r2 = await request(app).get(`/api/v1/admin/academic-reports?semester=${q}&department=${q}`).set(authHeader(admin));
      expect(r2.status).not.toBe(500);
    }
  });

  test('malformed ids never produce 500 on id-based routes', async () => {
    const { admin, ownerA } = await seed();
    const urls = [
      `/api/v1/library/books/nope`,
      `/api/v1/digital-library/books/nope/download`,
      `/api/v1/exams/hall-ticket/nope`,
      `/api/v1/hostel/booking/nope/cancel`,
      `/api/v1/grades/calculate/nope`,
      `/api/v1/placements/jobs/nope`,
    ];
    for (const url of urls) {
      const res = await request(app).get(url).set(authHeader(url.startsWith('/api/v1/hostel') || url.startsWith('/api/v1/exams') || url.startsWith('/api/v1/grades') ? ownerA : admin));
      expect(`${url} -> ${res.status}`).not.toContain('500');
      expect(res.status).not.toBe(500);
    }
  });

  test('vertical escalation attempts fail: student/faculty on admin writes', async () => {
    const { dept, facUser, ownerA } = await seed();
    const mk = (url, method = 'post', body = {}) => request(app)[method](url).set(authHeader(ownerA)).send(body);
    expect((await mk('/api/v1/faculty', 'post', { name: 'x' })).status).toBe(403);
    expect((await mk('/api/v1/fees', 'post', {})).status).toBe(403);
    expect((await request(app).post('/api/v1/notices').set(authHeader(ownerA)).send({ title: 'x', message: 'y', targetType: 'COLLEGE' })).status).toBe(403);
    expect((await request(app).get('/api/v1/admin/users').set(authHeader(facUser))).status).toBe(403);
    void dept;
  });
});

async function seedCheck(ownerA) {
  const Student = require('../src/models/Student');
  const profileA = await Student.findOne({ userId: ownerA._id });
  return { profileA };
}
