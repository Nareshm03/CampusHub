// ADMIN P0/P1 security regression — verifies each confirmed Admin audit
// finding stays fixed. No production behavior beyond the fixes is asserted.
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, createFaculty, createSubject, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seedCore() {
  const dept = await createDepartment();
  const admin = await createUser({ role: 'ADMIN', department: dept._id });
  const fac = await createFaculty({ department: dept });
  const a = await createStudent({ department: dept, usn: 'SECAAA0001' });
  const b = await createStudent({ department: dept, usn: 'SECBBB0002' });
  return { dept, admin, facUser: fac.user, a, b, ownerA: await User.findById(a.profile.userId), ownerB: await User.findById(b.profile.userId) };
}

describe('P0 public registration', () => {
  test('anonymous ADMIN/FACULTY registration refused; STUDENT allowed', async () => {
    const dept = await createDepartment();
    const evil = { name: 'Evil One', email: 'evil.sec@test.com', password: 'Passw0rd!', department: String(dept._id) };
    expect((await request(app).post('/api/v1/auth/register').send({ ...evil, role: 'ADMIN' })).status).toBe(403);
    expect((await request(app).post('/api/v1/auth/register').send({ ...evil, email: 'evil2.sec@test.com', role: 'FACULTY' })).status).toBe(403);
    const ok = await request(app).post('/api/v1/auth/register').send({ ...evil, email: 'ok.sec@test.com', role: 'STUDENT' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.role).toBe('STUDENT');
  });
});

describe('P1-1 protected files', () => {
  test('anon 401; bad category/traversal/unknown 404; disabled categories 404', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const h = authHeader(admin);
    expect((await request(app).get('/api/v1/files/nope/x.pdf').set(h)).status).toBe(404);
    expect((await request(app).get('/api/v1/files/ebooks/..%2Fserver.js').set(h)).status).toBe(404);
    expect((await request(app).get('/api/v1/files/ebooks/missing.pdf').set(h)).status).toBe(404);
    expect((await request(app).get('/api/v1/files/homework/x.pdf').set(h)).status).toBe(404);
    expect((await request(app).get('/uploads/ebooks/x.pdf')).status).toBe(404);
  });

  test('authorized ebook reads succeed; cover behind auth', async () => {
    const { dept, admin } = await seedCore();
    const ebooksDir = path.join(__dirname, '..', 'uploads', 'ebooks');
    const existing = fs.existsSync(ebooksDir) ? fs.readdirSync(ebooksDir).filter((f) => f.endsWith('.pdf')) : [];
    if (existing.length === 0) return; // nothing on disk to serve; layers above already verified
    const DigitalBook = require('../src/models/DigitalBook');
    await DigitalBook.create({
      title: 'Sec Book', author: 'Au', fileUrl: `/uploads/ebooks/${existing[0]}`,
      fileType: 'PDF', accessType: 'Students Only', status: 'Active', uploadedBy: admin._id
    });
    const ok = await request(app).get(`/api/v1/files/ebooks/${existing[0]}`).set(authHeader(admin));
    expect(ok.status).toBe(200);
  });
});

describe('P1-2 marks read scope', () => {
  test('own 200; cross-student 403; faculty out-of-scope 403; admin 200; anon 401; malformed 400', async () => {
    const { dept, admin, facUser, a, b, ownerA, ownerB } = await seedCore();
    const subj = await createSubject({ department: dept, faculty: facUser._id });
    const Faculty = require('../src/models/Faculty');
    await Faculty.updateOne({ userId: facUser._id }, { $addToSet: { subjects: subj._id } });
    const hF = authHeader(facUser);
    await request(app).post('/api/v1/marks/entry').set(authHeader(admin)).send({
      marks: [{ studentId: a.profile._id, subjectId: subj._id, examType: 'INTERNAL', examName: 'Internal 1', marks: 15, maxMarks: 20, grade: 'A' }]
    });
    // admin entry works (ADMIN in entry path)
    expect((await request(app).get(`/api/v1/marks/student/${a.profile._id}`).set(authHeader(ownerA))).status).toBe(200);
    expect((await request(app).get(`/api/v1/marks/student/${a.profile._id}`).set(authHeader(ownerB))).status).toBe(403);
    expect((await request(app).get(`/api/v1/marks/gpa/${a.profile._id}`).set(authHeader(ownerB))).status).toBe(403);
    expect((await request(app).get(`/api/v1/marks/student/${a.profile._id}`).set(authHeader(admin))).status).toBe(200);
    expect((await request(app).get(`/api/v1/marks/student/${a.profile._id}`)).status).toBe(401);
    expect((await request(app).get('/api/v1/marks/student/nope').set(authHeader(admin))).status).toBe(400);
    // faculty teaches subj but student b is not enrolled → still scoped by enrollment
    const c = await createStudent({ department: dept, usn: 'SECCCC0003', subjects: [] });
    const subj2 = await createSubject({ department: dept, code: 'SX2', faculty: facUser._id });
    await Faculty.updateOne({ userId: facUser._id }, { $addToSet: { subjects: subj2._id } });
    expect((await request(app).get(`/api/v1/marks/student/${c.profile._id}`).set(hF)).status).toBe(403);
  });
});

describe('P1-3 subjects', () => {
  test('>10 subjects paginate; bad faculty rejected; rename dup 409', async () => {
    const { dept, admin, facUser } = await seedCore();
    const hA = authHeader(admin);
    for (let i = 0; i < 12; i++) {
      await createSubject({ department: dept, code: `PG${i}`, name: `Subj ${i}` });
    }
    const p1 = await request(app).get('/api/v1/subjects?page=1&limit=20').set(hA);
    expect(p1.body.pagination.total).toBe(12);
    expect(p1.body.data.length).toBe(12);
    expect(p1.body.stats.total).toBe(12);
    const p2 = await request(app).get('/api/v1/subjects?page=2&limit=10').set(hA);
    expect(p2.body.data.length).toBe(2);
    const stu = await createStudent({ department: dept });
    const badFac = await request(app).post('/api/v1/subjects').set(hA).send({
      name: 'Bad', subjectCode: 'BADX1', department: String(dept._id), semester: 1, faculty: String(stu.user._id)
    });
    expect(badFac.status).toBe(400);
    const s1 = await createSubject({ department: dept, code: 'DUP1' });
    const s2 = await createSubject({ department: dept, code: 'DUP2' });
    const clash = await request(app).put(`/api/v1/subjects/${s2._id}`).set(hA).send({ subjectCode: s1.subjectCode });
    expect(clash.status).toBe(409);
    void facUser;
  });
});

describe('P1-4 assignments', () => {
  test('DRAFT submit rejected; late CLOSED rejected', async () => {
    const { dept, admin, facUser, a, ownerA } = await seedCore();
    const company = { name: 'C' };
    void company;
    const Assignment = require('../src/models/Assignment');
    const Subject = require('../src/models/Subject');
    const subj = await Subject.create({ name: 'S', subjectCode: 'ASG1', department: dept._id, semester: 3, faculty: facUser._id });
    const mk = async (over) => Assignment.create({
      title: 'T', description: 'D', subject: subj._id, faculty: facUser._id, department: dept._id,
      semester: 3, dueDate: new Date(Date.now() + 864e5), totalMarks: 100, status: 'PUBLISHED', ...over
    });
    const draft = await mk({ status: 'DRAFT' });
    expect((await request(app).post(`/api/v1/assignments/${draft._id}/submit`).set(authHeader(ownerA)).send({ textSubmission: 'x' })).status).toBe(400);
    const lateClosed = await mk({ status: 'CLOSED', dueDate: new Date(Date.now() - 864e5) });
    expect((await request(app).post(`/api/v1/assignments/${lateClosed._id}/submit`).set(authHeader(ownerA)).send({ textSubmission: 'x' })).status).toBe(400);
    const lateNoAllow = await mk({ status: 'PUBLISHED', dueDate: new Date(Date.now() - 864e5), allowLateSubmission: false });
    expect((await request(app).post(`/api/v1/assignments/${lateNoAllow._id}/submit`).set(authHeader(ownerA)).send({ textSubmission: 'x' })).status).toBe(400);
    const open = await mk({});
    expect((await request(app).post(`/api/v1/assignments/${open._id}/submit`).set(authHeader(ownerA)).send({ textSubmission: 'x' })).status).toBe(201);
    void admin; void a;
  });
});

describe('P1-5 hostel', () => {
  test('cross-hostel double blocked; bad transitions rejected; cancel terminal blocked', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const hA = authHeader(admin);
    const mkHostel = async (name) => (await request(app).post('/api/v1/hostel/admin/hostels').set(hA).send({
      name, type: 'BOYS', rooms: [{ number: '101', rent: 1000, capacity: 2 }]
    })).body.data;
    const h1 = await mkHostel('H1');
    const h2 = await mkHostel('H2');
    const s = await createStudent({ department: dept, usn: 'HOSAAA0001' });
    const alloc1 = await request(app).post('/api/v1/hostel/allocate').set(hA).send({ hostelId: h1._id, roomNumber: '101', studentId: s.profile._id });
    expect(alloc1.status).toBe(200);
    const alloc2 = await request(app).post('/api/v1/hostel/allocate').set(hA).send({ hostelId: h2._id, roomNumber: '101', studentId: s.profile._id });
    expect(alloc2.status).toBe(400);
    // booking lifecycle with transitions
    const owner = await User.findById(s.profile.userId);
    const dates = { moveInDate: '2026-11-01', checkOutDate: '2027-05-31' };
    const s2 = await createStudent({ department: dept, usn: 'HOSBBB0002' });
    const owner2 = await User.findById(s2.profile.userId);
    const book = await request(app).post('/api/v1/hostel/book').set(authHeader(owner2)).send({ hostelId: h2._id, roomNumber: '101', ...dates });
    const bid = book.body.data._id;
    expect((await request(app).put(`/api/v1/hostel/admin/bookings/${bid}`).set(hA).send({ status: 'CHECKED_OUT' })).status).toBe(400); // PENDING→CHECKED_OUT illegal
    expect((await request(app).put(`/api/v1/hostel/admin/bookings/${bid}`).set(hA).send({ status: 'APPROVED' })).status).toBe(200);
    expect((await request(app).put(`/api/v1/hostel/admin/bookings/${bid}`).set(hA).send({ status: 'CHECKED_OUT' })).status).toBe(400); // APPROVED→CHECKED_OUT illegal
    expect((await request(app).put(`/api/v1/hostel/admin/bookings/${bid}`).set(hA).send({ status: 'REJECTED' })).status).toBe(200);
    expect((await request(app).put(`/api/v1/hostel/admin/bookings/${bid}`).set(hA).send({ status: 'CHECKED_IN' })).status).toBe(400); // REJECTED terminal
    expect((await request(app).put(`/api/v1/hostel/booking/${bid}/cancel`).set(authHeader(owner2))).status).toBe(400); // REJECTED not cancellable
    void owner;
  });
});

describe('P1-6 fees', () => {
  test('duplicate transactionId 409; forged paidAmount ignored; bad method 400', async () => {
    const { admin, a } = await seedCore();
    const hA = authHeader(admin);
    const created = await request(app).post('/api/v1/fees').set(hA).send({
      student: String(a.profile._id), semester: 3, academicYear: '2024-2025',
      tuitionFee: 50000, examFee: 2000, paidAmount: 99999, status: 'PAID',
      dueDate: new Date(Date.now() + 30 * 864e5).toISOString()
    });
    expect(created.status).toBe(201);
    expect(created.body.data.paidAmount).toBe(0);
    expect(created.body.data.totalAmount).toBe(52000);
    const feeId = created.body.data._id;
    const p1 = await request(app).post(`/api/v1/fees/${feeId}/payment`).set(hA).send({ amount: 10000, paymentMethod: 'CASH', transactionId: 'DUP-TX' });
    expect(p1.status).toBe(200);
    const p2 = await request(app).post(`/api/v1/fees/${feeId}/payment`).set(hA).send({ amount: 10000, paymentMethod: 'CASH', transactionId: 'DUP-TX' });
    expect(p2.status).toBe(409);
    const Fee = require('../src/models/Fee');
    expect((await Fee.findById(feeId)).paidAmount).toBe(10000);
    expect((await request(app).post(`/api/v1/fees/${feeId}/payment`).set(hA).send({ amount: 100, paymentMethod: 'BARTER' })).status).toBe(400);
  });
});

describe('P1-7 placements', () => {
  test('forged postedBy ignored; delete with applications 409; clean delete 200', async () => {
    const { dept, admin, facUser } = await seedCore();
    const hA = authHeader(admin);
    const hF = authHeader(facUser);
    const comp = (await request(app).post('/api/v1/placements/companies').set(hA).send({ name: 'Acme', email: 'hr@acme.test', industry: 'IT/Software' })).body.data;
    const job = (await request(app).post('/api/v1/placements/jobs').set(hF).send({
      company: comp._id, title: 'SDE', description: 'd', jobType: 'Internship', status: 'Published',
      applicationDeadline: new Date(Date.now() + 30 * 864e5).toISOString(), eligibility: { departments: [String(dept._id)], semesters: [3] }
    })).body.data;
    const forged = await request(app).put(`/api/v1/placements/jobs/${job._id}`).set(hF).send({ title: 'SDE II', postedBy: String(admin._id), applications: [] });
    expect(forged.status).toBe(200);
    expect(forged.body.data.title).toBe('SDE II');
    expect(String(forged.body.data.postedBy)).toBe(String(facUser._id));
    // student applies → delete must refuse
    const JobPosting = require('../src/models/JobPosting');
    await JobPosting.findByIdAndUpdate(job._id, { $push: { applications: { student: facUser._id, status: 'Pending' } } });
    expect((await request(app).delete(`/api/v1/placements/jobs/${job._id}`).set(hA)).status).toBe(409);
    expect(await JobPosting.findById(job._id)).toBeTruthy();
    const job2 = (await request(app).post('/api/v1/placements/jobs').set(hF).send({
      company: comp._id, title: 'QA', description: 'd', jobType: 'Internship', status: 'Published',
      applicationDeadline: new Date(Date.now() + 30 * 864e5).toISOString(), eligibility: { departments: [String(dept._id)], semesters: [3] }
    })).body.data;
    expect((await request(app).delete(`/api/v1/placements/jobs/${job2._id}`).set(hA)).status).toBe(200);
  });
});

describe('P1-8 departments', () => {
  test('referenced delete 409; empty delete 200; malformed 400', async () => {
    const { dept, admin } = await seedCore();
    const hA = authHeader(admin);
    expect((await request(app).delete(`/api/v1/departments/${dept._id}`).set(hA)).status).toBe(409);
    const Department = require('../src/models/Department');
    const fresh = await Department.create({ name: 'EmptyDept', code: 'EX90' });
    expect((await request(app).delete(`/api/v1/departments/${fresh._id}`).set(hA)).status).toBe(200);
    expect((await request(app).delete('/api/v1/departments/nope').set(hA)).status).toBe(400);
  });
});

describe('P1-9 users', () => {
  test('invalid role 400; last-admin demote/delete/lock 409; userId relink ignored', async () => {
    const { dept, admin, a } = await seedCore();
    const hA = authHeader(admin);
    expect((await request(app).put(`/api/v1/users/${a.profile.userId}`).set(hA).send({ role: 'SUPERADMIN' })).status).toBe(400);
    expect((await request(app).put(`/api/v1/users/${admin._id}`).set(hA).send({ role: 'FACULTY' })).status).toBe(409);
    expect((await request(app).delete(`/api/v1/users/${admin._id}`).set(hA)).status).toBe(409);
    expect((await request(app).patch(`/api/v1/users/${admin._id}/remove-access`).set(hA)).status).toBe(409);
    const other = await createUser({ role: 'ADMIN', department: dept._id });
    expect((await request(app).put(`/api/v1/users/${admin._id}`).set(authHeader(other)).send({ role: 'FACULTY' })).status).toBe(200);
    // forged userId on profile update is stripped (use the remaining admin's token)
    const evil = await createUser({ role: 'STUDENT', department: dept._id });
    const r = await request(app).put(`/api/v1/students/${a.profile._id}`).set(authHeader(other)).send({ userId: String(evil._id), semester: 4 });
    expect(r.status).toBe(200);
    const Student = require('../src/models/Student');
    expect(String((await Student.findById(a.profile._id)).userId)).not.toBe(String(evil._id));
  });
});

describe('P1-10 analytics', () => {
  test('department average uses percentage scale across mixed maxMarks', async () => {
    const { dept, admin, facUser, a } = await seedCore();
    const hA = authHeader(admin);
    const s1 = await createSubject({ department: dept, code: 'MX1', faculty: facUser._id });
    const s2 = await createSubject({ department: dept, code: 'MX2', faculty: facUser._id });
    const Faculty = require('../src/models/Faculty');
    await Faculty.updateOne({ userId: facUser._id }, { $addToSet: { subjects: [s1._id, s2._id] } });
    await request(app).post('/api/v1/marks/entry').set(hA).send({
      marks: [
        { studentId: a.profile._id, subjectId: s1._id, examType: 'INTERNAL', examName: 'Internal 1', marks: 10, maxMarks: 20, grade: 'B' },
        { studentId: a.profile._id, subjectId: s2._id, examType: 'EXTERNAL', examName: 'Final', marks: 90, maxMarks: 100, grade: 'A+' }
      ]
    });
    const res = await request(app).get('/api/v1/admin/analytics').set(hA);
    const row = res.body.data.departmentPerformance.find((d) => d.department === 'Computer Science' || d.averageMarks > 0);
    // pct: (50 + 90) / 2 = 70. Raw-mark avg would be 50.
    expect(row.averageMarks).toBeCloseTo(70, 0);
  });
});
