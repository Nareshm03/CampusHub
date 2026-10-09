// EXAMS — listing, registration, duplicates, free/paid, hall ticket,
// results, revaluation, ownership. (Active /exams contract only; the
// incompatible examSchedule architecture is intentionally not revived.)
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createStudent, createSubject, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');
const Exam = require('../src/models/Exam');
const ExamResult = require('../src/models/ExamResult');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seed() {
  const dept = await createDepartment();
  const subject = await createSubject({ department: dept });
  const a = await createStudent({ department: dept, usn: 'EXMAAA0001' });
  const b = await createStudent({ department: dept, usn: 'EXMBBB0002' });
  const future = new Date(Date.now() + 30 * 864e5);
  const examDate = new Date(Date.now() + 60 * 864e5);
  const base = { subject: subject._id, department: dept._id, semester: 3, examDate, duration: 180, maxMarks: 100, venue: 'Hall A', registrationDeadline: future, status: 'upcoming' };
  const free = await Exam.create({ ...base, title: 'Free Midterm', fee: 0 });
  const paid = await Exam.create({ ...base, title: 'Paid Final', fee: 500 });
  const expired = await Exam.create({ ...base, title: 'Expired', registrationDeadline: new Date(Date.now() - 864e5), fee: 0 });
  return { dept, subject, a, b, free, paid, expired };
}

const form = (usn) => ({
  personalDetails: { name: 'Test Student', usn, email: 's@test.com', phone: '9876543210', address: 'Addr' },
  academicDetails: { department: 'CS', semester: 3, subjects: [] },
});

describe('exams', () => {
  test('student lists real available exams with subject codes; expired excluded', async () => {
    const { a, free, expired } = await seed();
    const ownerA = await User.findById(a.profile.userId);
    const res = await request(app).get('/api/v1/exams/available').set(authHeader(ownerA));
    expect(res.status).toBe(200);
    const ids = res.body.exams.map((e) => e._id);
    expect(ids).toContain(String(free._id));
    expect(ids).not.toContain(String(expired._id));
    const listed = res.body.exams.find((e) => e._id === String(free._id));
    expect(listed.subject.subjectCode).toBeTruthy();
  });

  test('free registration confirms instantly; duplicate rejected; invalid rejected', async () => {
    const { a, free } = await seed();
    const ownerA = await User.findById(a.profile.userId);
    const ok = await request(app).post('/api/v1/exams/register').set(authHeader(ownerA))
      .send({ examId: String(free._id), formData: form('EXMAAA0001') });
    expect(ok.status).toBe(200);
    expect(ok.body.registration.status).toBe('confirmed');
    expect(ok.body.registration.hallTicketNumber).toBeTruthy();

    const dup = await request(app).post('/api/v1/exams/register').set(authHeader(ownerA))
      .send({ examId: String(free._id), formData: form('EXMAAA0001') });
    expect(dup.status).toBe(400);

    const bad = await request(app).post('/api/v1/exams/register').set(authHeader(ownerA))
      .send({ examId: 'not-an-id', formData: form('EXMAAA0001') });
    expect(bad.status).toBe(400);
  });

  test('paid flow: fee_pending, hall ticket blocked, unverified pay refused, state unchanged', async () => {
    const { a, b, paid } = await seed();
    const ownerA = await User.findById(a.profile.userId);
    const ownerB = await User.findById(b.profile.userId);
    const reg = await request(app).post('/api/v1/exams/register').set(authHeader(ownerA))
      .send({ examId: String(paid._id), formData: form('EXMAAA0001') });
    expect(reg.body.registration.status).toBe('fee_pending');
    const regId = reg.body.registration._id;

    const early = await request(app).get(`/api/v1/exams/hall-ticket/${regId}`).set(authHeader(ownerA));
    expect(early.status).toBe(400);

    // A client-minted paymentId must never flip fee_pending to paid: no
    // trusted exam payment provider exists, so the server refuses honestly.
    const fake = await request(app).post('/api/v1/exams/pay-fee').set(authHeader(ownerA))
      .send({ registrationId: regId, paymentId: 'PAYTEST12345' });
    expect(fake.status).toBe(503);

    const forged = await request(app).post('/api/v1/exams/pay-fee').set(authHeader(ownerA))
      .send({ registrationId: regId });
    expect(forged.status).toBe(503);

    // Cross-student pay attempt stays forbidden.
    const cross = await request(app).post('/api/v1/exams/pay-fee').set(authHeader(ownerB))
      .send({ registrationId: regId, paymentId: 'PAYTEST99999' });
    expect(cross.status).toBe(403);

    // State unchanged: still fee_pending, hall ticket still blocked.
    const still = await request(app).get(`/api/v1/exams/hall-ticket/${regId}`).set(authHeader(ownerA));
    expect(still.status).toBe(400);
    const mine = await request(app).get('/api/v1/exams/my-registrations').set(authHeader(ownerA));
    const mineReg = (mine.body.registrations || []).find((x) => x._id === regId);
    expect(mineReg.status).toBe('fee_pending');
  });

  test('hall ticket: own ok with populated fields; cross-student 403; malformed 400', async () => {
    const { a, b, free } = await seed();
    const ownerA = await User.findById(a.profile.userId);
    const ownerB = await User.findById(b.profile.userId);
    const reg = await request(app).post('/api/v1/exams/register').set(authHeader(ownerA))
      .send({ examId: String(free._id), formData: form('EXMAAA0001') });
    const regId = reg.body.registration._id;

    const own = await request(app).get(`/api/v1/exams/hall-ticket/${regId}`).set(authHeader(ownerA));
    expect(own.status).toBe(200);
    expect(own.body.hallTicket.registrationNumber).toBeTruthy();
    expect(own.body.hallTicket.student.usn).toBe('EXMAAA0001');

    const cross = await request(app).get(`/api/v1/exams/hall-ticket/${regId}`).set(authHeader(ownerB));
    expect(cross.status).toBe(403);

    const malformed = await request(app).get('/api/v1/exams/hall-ticket/nope').set(authHeader(ownerA));
    expect(malformed.status).toBe(400);
  });

  test('results show published only; revaluation once; cross-student 403', async () => {
    const { a, b, free, paid } = await seed();
    await ExamResult.create({ student: a.profile._id, exam: free._id, marksObtained: 80, grade: 'A', status: 'pass', isPublished: true });
    await ExamResult.create({ student: a.profile._id, exam: paid._id, marksObtained: 20, grade: 'F', status: 'fail', isPublished: false });
    const ownerA = await User.findById(a.profile.userId);
    const ownerB = await User.findById(b.profile.userId);

    const res = await request(app).get('/api/v1/exams/results').set(authHeader(ownerA));
    expect(res.body.results).toHaveLength(1);

    const resultId = res.body.results[0]._id;
    expect((await request(app).post('/api/v1/exams/revaluation').set(authHeader(ownerA)).send({ resultId })).status).toBe(200);
    expect((await request(app).post('/api/v1/exams/revaluation').set(authHeader(ownerA)).send({ resultId })).status).toBe(400);
    expect((await request(app).post('/api/v1/exams/revaluation').set(authHeader(ownerB)).send({ resultId })).status).toBe(403);
  });
});
