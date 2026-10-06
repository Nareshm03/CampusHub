// ANALYTICS — representative admin/student/faculty coverage, ownership,
// filter validation, calculation consistency (percentages, PRESENT math).
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, createFaculty, createSubject, authHeader } = require('./helpers/factories');
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
  const { user: facUser } = await createFaculty({ department: dept });
  const sub = await createSubject({ department: dept, faculty: facUser._id, semester: 3, credits: 4 });
  const a = await createStudent({ department: dept, usn: 'ANAAAA0001', semester: 3 });
  const b = await createStudent({ department: dept, usn: 'ANABBB0002', semester: 3 });
  const ownerA = await User.findById(a.profile.userId);
  const ownerB = await User.findById(b.profile.userId);

  const adminUser = admin;
  // Marks: A = 80,70 (pct); B = 40,30
  const mk = (s, marks, max, name) => Marks.create({
    student: s.profile._id, subject: sub._id, examType: 'INTERNAL', examName: name,
    marks, maxMarks: max, grade: 'X', enteredBy: adminUser._id,
  });
  await mk(a, 40, 50, 'Internal 1'); // 80
  await mk(a, 70, 100, 'Final');     // 70
  await mk(b, 20, 50, 'Internal 1'); // 40
  await mk(b, 30, 100, 'Final');     // 30
  const day = (n) => new Date(Date.now() - n * 864e5);
  await Attendance.insertMany([
    { student: a.profile._id, subject: sub._id, status: 'PRESENT', date: day(4), markedBy: facUser._id },
    { student: a.profile._id, subject: sub._id, status: 'PRESENT', date: day(3), markedBy: facUser._id },
    { student: a.profile._id, subject: sub._id, status: 'ABSENT', date: day(2), markedBy: facUser._id },
    { student: b.profile._id, subject: sub._id, status: 'PRESENT', date: day(1), markedBy: facUser._id },
  ]);
  return { dept, admin, facUser, sub, a, b, ownerA, ownerB };
}

describe('analytics', () => {
  test('student dashboard matches manual math; no NaN; identity correct', async () => {
    const { ownerA } = await seed();
    const res = await request(app).get('/api/v1/analytics/dashboard').set(authHeader(ownerA));
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.overallStats.average).toBe(75); // (80+70)/2
    expect(d.overallStats.total).toBe(2);
    expect(d.attendanceStats.overall).toBeCloseTo(66.67, 1); // 2 PRESENT of 3
    expect(d.student.usn).toBe('ANAAAA0001');
    expect(d.rankData.rank).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain('NaN');
  });

  test('cross-student analytics blocked; malformed studentId is 400', async () => {
    const { a, admin, ownerB } = await seed();
    const cross = await request(app).get(`/api/v1/analytics/dashboard?studentId=${a.profile._id}`).set(authHeader(ownerB));
    expect(cross.status).toBe(403);
    // Ownership is evaluated before format for students; staff get format validation
    const badStudent = await request(app).get('/api/v1/analytics/dashboard?studentId=nope').set(authHeader(ownerB));
    expect(badStudent.status).toBe(403);
    const badAdmin = await request(app).get('/api/v1/analytics/dashboard?studentId=nope').set(authHeader(admin));
    expect(badAdmin.status).toBe(400);
  });

  test('department analytics validates scope; averages are percentage-based', async () => {
    const { dept, facUser } = await seed();
    const res = await request(app).get(`/api/v1/analytics/department?departmentId=${dept._id}`).set(authHeader(facUser));
    expect(res.status).toBe(200);
    expect(res.body.data.averagePerformance).toBe(55); // (80+70+40+30)/4
    expect(res.body.data.passPercentage).toBe(75);

    expect((await request(app).get('/api/v1/analytics/department').set(authHeader(facUser))).status).toBe(400);
    expect((await request(app).get('/api/v1/analytics/department?departmentId=all').set(authHeader(facUser))).status).toBe(400);
  });

  test('faculty dashboard scoped to own subjects with real usn data', async () => {
    const { facUser, sub } = await seed();
    const res = await request(app).get('/api/v1/faculty-analytics/dashboard').set(authHeader(facUser));
    expect(res.status).toBe(200);
    const subj = res.body.data.subjects.find((s) => s.subject.name === sub.name);
    expect(subj.students.unique).toBe(2);
    expect(subj.performance.average).toBe(55);
    expect(subj.attendance.averageAttendance).toBeCloseTo(75, 1); // 3 PRESENT of 4

    const detail = await request(app).get(`/api/v1/faculty-analytics/subject/${sub._id}`).set(authHeader(facUser));
    expect(detail.status).toBe(200);
    expect(detail.body.data.students.every((s) => s.student.usn)).toBe(true);
  });

  test('admin overview consistent: totals, attendance rate, percentage buckets', async () => {
    const { admin } = await seed();
    const res = await request(app).get('/api/v1/admin/analytics').set(authHeader(admin));
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totalStudents).toBe(2);
    expect(Number(d.attendanceRate)).toBe(75); // 3 PRESENT of 4
    const buckets = Object.fromEntries(d.gradeDistribution.map((g) => [g.name, g.count]));
    expect(buckets['A (70-79)']).toBe(1);
    expect(buckets['Below 40'] || buckets['F (0-39)']).toBe(1);
  });

  test('predictions handle empty history without NaN', async () => {
    const { dept } = await seed();
    const { profile } = await createStudent({ department: dept, usn: 'ANAEMPTY03' });
    const User = require('../src/models/User');
    const owner = await User.findById(profile.userId);
    const res = await request(app).get('/api/v1/analytics/predictions').set(authHeader(owner));
    expect(res.status).toBe(200);
    expect(res.body.data.predictions.trend).toBe('insufficient_data');
    expect(JSON.stringify(res.body)).not.toContain('NaN');
  });
});
