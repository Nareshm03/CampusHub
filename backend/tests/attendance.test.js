// ATTENDANCE — marking, summaries, trends, faculty scope, enum safety.
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createStudent, createFaculty, createSubject, authHeader } = require('./helpers/factories');
const Attendance = require('../src/models/Attendance');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seed() {
  const dept = await createDepartment();
  const { user: facUser } = await createFaculty({ department: dept });
  const subject = await createSubject({ department: dept, faculty: facUser._id });
  const a = await createStudent({ department: dept, usn: 'ATTAAA0001' });
  const b = await createStudent({ department: dept, usn: 'ATTBBB0002' });
  return { dept, facUser, subject, a, b };
}

const records = (sa, sb, subject, statuses) => statuses.map(([student, status, day]) => ({
  studentId: String(student.profile._id),
  subjectId: String(subject._id),
  date: `2026-09-${String(day).padStart(2, '0')}`,
  status,
}));

describe('attendance', () => {
  test('faculty marks attendance; duplicate write updates in place', async () => {
    const { facUser, subject, a } = await seed();
    const body = { attendance: records(a, a, subject, [[a, 'PRESENT', 1], [a, 'ABSENT', 2]]) };
    const first = await request(app).post('/api/v1/attendance/mark').set(authHeader(facUser)).send(body);
    expect(first.status).toBe(200);
    expect(await Attendance.countDocuments()).toBe(2);

    const retry = await request(app).post('/api/v1/attendance/mark').set(authHeader(facUser)).send(body);
    expect(retry.status).toBe(200);
    expect(await Attendance.countDocuments()).toBe(2); // no duplicates
  });

  test('invalid enum and non-array payload are rejected', async () => {
    const { facUser, subject, a } = await seed();
    const badEnum = await request(app).post('/api/v1/attendance/mark').set(authHeader(facUser)).send({
      attendance: [{ studentId: String(a.profile._id), subjectId: String(subject._id), date: '2026-09-01', status: 'GOOD' }],
    });
    expect([400, 500]).toContain(badEnum.status);
    expect(badEnum.body.success).not.toBe(true);

    const notArray = await request(app).post('/api/v1/attendance/mark').set(authHeader(facUser)).send({ attendance: 'nope' });
    expect(notArray.status).toBe(400);
  });

  test('faculty cannot mark subjects they do not teach', async () => {
    const { subject, a } = await seed();
    const other = await createFaculty({});
    const res = await request(app).post('/api/v1/attendance/mark').set(authHeader(other.user)).send({
      attendance: records(a, a, subject, [[a, 'PRESENT', 3]]),
    });
    expect(res.status).toBe(403);
  });

  test('student sees own summary with correct PRESENT math', async () => {
    const { facUser, subject, a, b } = await seed();
    await request(app).post('/api/v1/attendance/mark').set(authHeader(facUser)).send({
      attendance: [
        ...records(a, b, subject, [[a, 'PRESENT', 1], [a, 'PRESENT', 2], [a, 'ABSENT', 3], [a, 'LATE', 4]]),
        ...records(b, b, subject, [[b, 'PRESENT', 1]]),
      ],
    });
    const User = require('../src/models/User');
    const ownerA = await User.findById(a.profile.userId);
    const res = await request(app).get('/api/v1/attendance/my-summary').set(authHeader(ownerA));
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).toContain('50'); // 2 PRESENT of 4
    expect(body).not.toContain('NaN');
  });

  test('student cannot read another student record; malformed id is not a 500', async () => {
    const { facUser, subject, a, b } = await seed();
    await request(app).post('/api/v1/attendance/mark').set(authHeader(facUser)).send({
      attendance: records(a, b, subject, [[a, 'PRESENT', 5], [b, 'PRESENT', 6]]),
    });
    const User = require('../src/models/User');
    const ownerB = await User.findById(b.profile.userId);
    // Controller force-scopes students to their own profile: asking for
    // another id must return ONLY the caller's own records (no leak).
    const cross = await request(app).get(`/api/v1/attendance/summary/${a.profile._id}`).set(authHeader(ownerB));
    expect(cross.status).toBe(200);
    expect(cross.body.data).toHaveLength(1); // B's single record, not A's
    expect(String(cross.body.data[0].presentClasses)).toBe('1');

    const malformed = await request(app).get('/api/v1/attendance/summary/not-an-id').set(authHeader(ownerB));
    expect(malformed.status).not.toBe(500);
  });
});
