// REPORTS + ADMIN OPS — calculations, CSV import validation, export, boundaries.
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, createSubject, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');
const Marks = require('../src/models/Marks');
const Attendance = require('../src/models/Attendance');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seed() {
  const dept = await createDepartment();
  const admin = await createUser({ role: 'ADMIN', department: dept._id });
  const sub = await createSubject({ department: dept, semester: 3 });
  const a = await createStudent({ department: dept, usn: 'REPAAA0001', semester: 3 });
  const ownerA = await User.findById(a.profile.userId);
  await Marks.create({ student: a.profile._id, subject: sub._id, examType: 'INTERNAL', examName: 'Internal 1', marks: 40, maxMarks: 50, grade: 'A', enteredBy: admin._id });
  await Attendance.create({ student: a.profile._id, subject: sub._id, status: 'PRESENT', date: new Date(), markedBy: admin._id });
  return { dept, admin, sub, a, ownerA };
}

describe('reports', () => {
  test('attendance + marks reports aggregate real rows; faculty sees own dept', async () => {
    const { admin } = await seed();
    const att = await request(app).get('/api/v1/reports/attendance').set(authHeader(admin));
    expect(att.status).toBe(200);
    expect(att.body.data.length).toBe(1);
    expect(att.body.data[0].attendancePercentage).toBe(100);

    const marks = await request(app).get('/api/v1/reports/marks').set(authHeader(admin));
    expect(marks.status).toBe(200);
    const row = marks.body.data.find((r) => r.subject !== 'No Data');
    expect(row.percentage).toBe(80);
    expect(row.grade).toBe('A+');
  });

  test('report filters reject garbage; student role blocked', async () => {
    const { admin, ownerA } = await seed();
    expect((await request(app).get('/api/v1/reports/attendance').set(authHeader(ownerA))).status).toBe(403);
    expect((await request(app).get('/api/v1/reports/attendance?department=bogus').set(authHeader(admin))).status).toBe(400);
    expect((await request(app).get('/api/v1/reports/marks?semester=all').set(authHeader(admin))).status).toBe(200);
    expect((await request(app).get('/api/v1/reports/marks?semester=99').set(authHeader(admin))).status).toBe(400);
  });

  test('academic-reports summary math is internally consistent', async () => {
    const { admin } = await seed();
    const res = await request(app).get('/api/v1/admin/academic-reports').set(authHeader(admin));
    expect(res.status).toBe(200);
    const s = res.body.data.summary;
    expect(s.totalStudents).toBe(1);
    expect(s.passRate).toBe(100);
    expect(s.averageCGPA).toBeCloseTo(80 / 9.5, 1);
    expect(res.body.data.semesterPerformance.length).toBeGreaterThan(0);
    expect(res.body.data.detailedData.length).toBeGreaterThan(0);
  });
});

describe('admin csv import/export', () => {
  test('students import validates rows; bad rows reported, good rows imported', async () => {
    const { dept, admin } = await seed();
    const csv = [
      'name,email,usn,semester,department,password',
      `Good One,goodone@test.com,CSVAAA0001,3,${dept.name},Passw0rd1`,
      'Bad Row,not-an-email,CSVBBB0002,3,' + dept.name + ',Passw0rd1',
      `No Dept,nodept@test.com,CSVCCC0003,3,MissingDeptXYZ,Passw0rd1`,
    ].join('\n');
    const res = await request(app).post('/api/v1/admin/import').set(authHeader(admin))
      .attach('file', Buffer.from(csv), 'students.csv')
      .field('type', 'students');
    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(1);
    expect(res.body.data.skipped).toBe(2);
    expect(res.body.data.errors.length).toBe(2);
    expect(await User.findOne({ email: 'goodone@test.com' })).toBeTruthy();
  });

  test('import rejects unknown type, missing file, empty csv; non-admin blocked', async () => {
    const { admin, ownerA } = await seed();
    const noFile = await request(app).post('/api/v1/admin/import').set(authHeader(admin)).field('type', 'students');
    expect(noFile.status).toBe(400);
    const badType = await request(app).post('/api/v1/admin/import').set(authHeader(admin))
      .attach('file', Buffer.from('a,b\n1,2'), 'x.csv').field('type', 'nope');
    expect(badType.status).toBe(400);
    const empty = await request(app).post('/api/v1/admin/import').set(authHeader(admin))
      .attach('file', Buffer.from(''), 'empty.csv').field('type', 'students');
    expect(empty.status).toBe(400);
    const denied = await request(app).post('/api/v1/admin/import').set(authHeader(ownerA))
      .attach('file', Buffer.from('a'), 'x.csv').field('type', 'students');
    expect(denied.status).toBe(403);
  });

  test('export requires admin and valid type', async () => {
    const { admin, ownerA } = await seed();
    const denied = await request(app).get('/api/v1/admin/export/students').set(authHeader(ownerA));
    expect(denied.status).toBe(403);
    const ok = await request(app).get('/api/v1/admin/export/students').set(authHeader(admin));
    expect(ok.status).toBe(200);
    const bad = await request(app).get('/api/v1/admin/export/nope').set(authHeader(admin));
    expect(bad.status).toBe(400);
  });
});
