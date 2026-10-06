// MARKS + GPA — entry, idempotent updates, ownership, GPA math.
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createStudent, createFaculty, createSubject, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');
const Marks = require('../src/models/Marks');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seed() {
  const dept = await createDepartment();
  const { user: facUser } = await createFaculty({ department: dept });
  const subject = await createSubject({ department: dept, faculty: facUser._id, credits: 4 });
  const a = await createStudent({ department: dept, usn: 'MRKAAA0001' });
  const b = await createStudent({ department: dept, usn: 'MRKBBB0002' });
  return { dept, facUser, subject, a, b };
}

const entry = (sa, subject, examName, marks, maxMarks = 50) => ({
  studentId: String(sa.profile._id),
  subjectId: String(subject._id),
  examType: 'INTERNAL',
  examName,
  marks,
  maxMarks,
  grade: 'A',
});

describe('marks + gpa', () => {
  test('faculty enters marks; re-entry updates (no duplicate rows)', async () => {
    const { facUser, subject, a } = await seed();
    const first = await request(app).post('/api/v1/marks/entry').set(authHeader(facUser))
      .send({ marks: [entry(a, subject, 'Internal 1', 40)] });
    expect(first.status).toBe(200);
    const again = await request(app).post('/api/v1/marks/entry').set(authHeader(facUser))
      .send({ marks: [entry(a, subject, 'Internal 1', 44)] });
    expect(again.status).toBe(200);
    expect(await Marks.countDocuments()).toBe(1);
    expect((await Marks.findOne()).marks).toBe(44);
  });

  test('faculty cannot enter marks for unassigned subjects; student cannot enter', async () => {
    const { subject, a } = await seed();
    const outsider = await createFaculty({});
    const denied = await request(app).post('/api/v1/marks/entry').set(authHeader(outsider.user))
      .send({ marks: [entry(a, subject, 'Internal 1', 40)] });
    expect(denied.status).toBe(403);

    const ownerA = await User.findById(a.profile.userId);
    const studentTry = await request(app).post('/api/v1/marks/entry').set(authHeader(ownerA))
      .send({ marks: [entry(a, subject, 'Internal 1', 40)] });
    expect(studentTry.status).toBe(403);
  });

  test('student reads only own marks', async () => {
    const { facUser, subject, a, b } = await seed();
    await request(app).post('/api/v1/marks/entry').set(authHeader(facUser)).send({
      marks: [entry(a, subject, 'Internal 1', 40), entry(b, subject, 'Internal 1', 20)],
    });
    const ownerA = await User.findById(a.profile.userId);
    const res = await request(app).get('/api/v1/marks/my').set(authHeader(ownerA));
    expect(res.status).toBe(200);
    const rows = res.body.data || res.body.marks || [];
    expect(rows.length).toBeGreaterThan(0);
    // No row belonging to B may appear
    expect(JSON.stringify(rows)).not.toContain('MRKBBB0002');
  });

  test('GPA math matches persisted rows (external 70/100 => gp 8)', async () => {
    const { facUser, subject, a } = await seed();
    await request(app).post('/api/v1/marks/entry').set(authHeader(facUser)).send({
      marks: [{
        studentId: String(a.profile._id),
        subjectId: String(subject._id),
        examType: 'EXTERNAL', examName: 'Final',
        marks: 70, maxMarks: 100, grade: 'A',
      }],
    });
    const ownerA = await User.findById(a.profile.userId);
    const res = await request(app).get('/api/v1/grades/calculate/me').set(authHeader(ownerA));
    expect(res.status).toBe(200);
    // 70% => grade point 8, 4 credits => CGPA 8.00
    expect(res.body.data.cgpa).toBe(8);
  });

  test('malformed mark payloads are rejected, never 500-silent', async () => {
    const { facUser } = await seed();
    const res = await request(app).post('/api/v1/marks/entry').set(authHeader(facUser))
      .send({ marks: 'not-an-array' });
    expect(res.status).toBe(400);
  });
});
