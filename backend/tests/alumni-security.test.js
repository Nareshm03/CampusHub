// ALUMNI security + integrity regression — ownership, identity, directory
// privacy, pagination safety, orphan handling, search, graduation
// idempotency, mentorship notifications. Isolated deterministic fixtures.
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, createFaculty, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Alumni = require('../src/models/Alumni');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

let deptSeq = 0;
const mkDept = () => createDepartment(`Dept${deptSeq}`, `D${deptSeq++}`);

async function seed() {
  const dept = await mkDept();
  const admin = await createUser({ role: 'ADMIN', department: dept._id });
  const { user: facUser } = await createFaculty({ department: dept });
  const a = await createStudent({ department: dept, usn: 'ALUAAA0001' });
  const b = await createStudent({ department: dept, usn: 'ALUBBB0002' });
  const par = await createUser({ role: 'PARENT', email: 'alumni.par@test.com' });
  return {
    dept, admin, facUser, a, b, par,
    ownerA: await User.findById(a.profile.userId),
    ownerB: await User.findById(b.profile.userId)
  };
}

async function graduate(admin, profileId, overrides = {}) {
  return request(app).post(`/api/v1/students/${profileId}/graduate`).set(authHeader(admin)).send({
    graduationYear: 2024, currentCompany: 'Acme', currentPosition: 'SDE', ...overrides
  });
}

describe('alumni mentorship requests', () => {
  test('valid request resolves the correct Student identity and persists', async () => {
    const { admin, a, b, ownerB } = await seed();
    await graduate(admin, a.profile._id);
    const mentor = await Alumni.findOneAndUpdate(
      { studentId: a.profile._id },
      { mentorshipOffered: true, mentorshipAreas: ['Careers'] },
      { new: true }
    );
    const res = await request(app).post(`/api/v1/alumni/mentors/${mentor._id}/request`).set(authHeader(ownerB)).send({});
    expect(res.status).toBe(201);
    const reread = await Alumni.findById(mentor._id);
    expect(reread.mentoringStudents.length).toBe(1);
    expect(String(reread.mentoringStudents[0].student)).toBe(String(b.profile._id));
  });

  test('missing mentor 404; missing requester profile 404; self-request 400', async () => {
    const { admin, a, ownerA } = await seed();
    await graduate(admin, a.profile._id);
    const mentor = await Alumni.findOneAndUpdate(
      { studentId: a.profile._id },
      { mentorshipOffered: true, mentorshipAreas: ['Careers'] },
      { new: true }
    );
    expect((await request(app).post('/api/v1/alumni/mentors/000000000000000000000000/request').set(authHeader(ownerA)).send({})).status).toBe(404);
    expect((await request(app).post(`/api/v1/alumni/mentors/${mentor._id}/request`).set(authHeader(ownerA)).send({})).status).toBe(400);
    const noProf = await createUser({ role: 'STUDENT', email: 'noprof.sec@test.com', department: (await mkDept())._id });
    expect((await request(app).post(`/api/v1/alumni/mentors/${mentor._id}/request`).set(authHeader(noProf)).send({})).status).toBe(404);
  });

  test('duplicate active request 409; notified exactly once', async () => {
    const { admin, ownerB, a } = await seed();
    await graduate(admin, a.profile._id);
    const mentor = await Alumni.findOneAndUpdate(
      { studentId: a.profile._id },
      { mentorshipOffered: true, mentorshipAreas: ['Careers'] },
      { new: true }
    );
    const Notification = require('../src/models/Notification');
    expect((await request(app).post(`/api/v1/alumni/mentors/${mentor._id}/request`).set(authHeader(ownerB)).send({})).status).toBe(201);
    expect((await request(app).post(`/api/v1/alumni/mentors/${mentor._id}/request`).set(authHeader(ownerB)).send({})).status).toBe(409);
    const notes = await Notification.find({ recipient: (await User.findById(a.profile.userId))._id, title: 'New mentorship request' });
    expect(notes.length).toBe(1);
  });
});

describe('alumni write ownership', () => {
  test('cross-alumni job write denied; forged fields ignored', async () => {
    const { admin, a, ownerB } = await seed();
    await graduate(admin, a.profile._id);
    const mentor = await Alumni.findOne();
    const forged = await request(app).post(`/api/v1/alumni/${mentor._id}/jobs`).set(authHeader(ownerB)).send({ title: 'Spam', company: 'X' });
    expect(forged.status).toBe(403);
    expect(await Alumni.findOne({ 'jobPostings.title': 'Spam' })).toBeNull();
    const owner = await User.findById(a.profile.userId);
    const own = await request(app).post(`/api/v1/alumni/${mentor._id}/jobs`).set(authHeader(owner)).send({
      title: 'Real Role', company: 'Acme', postedAt: '2001-01-01', isActive: false, bogusField: 'x'
    });
    expect(own.status).toBe(201);
    const reread = await Alumni.findById(mentor._id);
    const job = reread.jobPostings[reread.jobPostings.length - 1];
    expect(job.title).toBe('Real Role');
    expect(job.isActive).toBe(true);
    expect(job.bogusField).toBeUndefined();
  });

  test('cross-alumni mentorship update denied; validation enforced; opt-out works', async () => {
    const { admin, a, ownerB } = await seed();
    await graduate(admin, a.profile._id);
    const mentor = await Alumni.findOne();
    expect((await request(app).put(`/api/v1/alumni/${mentor._id}/mentorship`).set(authHeader(ownerB)).send({ mentorshipAreas: ['X'] })).status).toBe(403);
    const owner = await User.findById(a.profile.userId);
    expect((await request(app).put(`/api/v1/alumni/${mentor._id}/mentorship`).set(authHeader(owner)).send({ mentorshipAreas: [] })).status).toBe(400);
    expect((await request(app).put(`/api/v1/alumni/${mentor._id}/mentorship`).set(authHeader(owner)).send({ mentorshipAreas: ['Careers'] })).status).toBe(200);
    expect((await request(app).put(`/api/v1/alumni/${mentor._id}/mentorship`).set(authHeader(owner)).send({ mentorshipOffered: false })).status).toBe(200);
    expect((await Alumni.findById(mentor._id)).mentorshipOffered).toBe(false);
    expect((await request(app).put('/api/v1/alumni/nope/mentorship').set(authHeader(admin)).send({ mentorshipAreas: ['X'] })).status).toBe(400);
  });
});

describe('directory privacy and reads', () => {
  test('STUDENT+ADMIN allowed; FACULTY/PARENT/anon denied; safe fields only', async () => {
    const { admin, facUser, par, ownerA, a } = await seed();
    await graduate(admin, a.profile._id);
    expect((await request(app).get('/api/v1/alumni').set(authHeader(admin))).status).toBe(200);
    expect((await request(app).get('/api/v1/alumni').set(authHeader(ownerA))).status).toBe(200);
    expect((await request(app).get('/api/v1/alumni').set(authHeader(facUser))).status).toBe(403);
    expect((await request(app).get('/api/v1/alumni').set(authHeader(par))).status).toBe(403);
    expect((await request(app).get('/api/v1/alumni')).status).toBe(401);
    const body = (await request(app).get('/api/v1/alumni').set(authHeader(admin))).body.data[0];
    expect(Object.keys(body).sort()).toEqual(['_id', 'currentCompany', 'currentPosition', 'graduationYear', 'linkedinProfile', 'mentorshipAreas', 'mentorshipOffered', 'studentId']);
    expect(JSON.stringify(body)).not.toMatch(/password|isActive|createdAt|achievements/);
  });

  test('regex metacharacters never 500; pagination bounded; search narrows', async () => {
    const { admin, a } = await seed();
    await graduate(admin, a.profile._id);
    const hA = authHeader(admin);
    expect((await request(app).get('/api/v1/alumni?company=([').set(hA)).status).toBe(200);
    const huge = await request(app).get('/api/v1/alumni?limit=999999').set(hA);
    expect(huge.body.pagination.limit).toBeLessThanOrEqual(100);
    const bad = await request(app).get('/api/v1/alumni?page=abc&limit=-5').set(hA);
    expect(bad.status).toBe(200);
    expect(bad.body.pagination.page).toBe(1);
    const all = await request(app).get('/api/v1/alumni').set(hA);
    const named = await request(app).get('/api/v1/alumni?search=Test').set(hA);
    expect(named.body.data.length).toBeLessThanOrEqual(all.body.data.length);
    const none = await request(app).get('/api/v1/alumni?search=ZZZNOPEZZZ').set(hA);
    expect(none.body.data.length).toBe(0);
  });

  test('orphan records excluded, never fabricated', async () => {
    const { admin, a } = await seed();
    await graduate(admin, a.profile._id);
    await Student.deleteOne({ _id: a.profile._id });
    const res = await request(app).get('/api/v1/alumni').set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });
});

describe('graduation idempotency', () => {
  test('repeat graduates predictably; recovery completes flag-without-doc', async () => {
    const { admin, a } = await seed();
    const hA = authHeader(admin);
    expect((await graduate(admin, a.profile._id)).status).toBe(200);
    expect((await graduate(admin, a.profile._id)).status).toBe(400);
    // simulate failed second write: flag set, no Alumni doc
    const s2 = await (async () => {
      const dept = await mkDept();
      return createStudent({ department: dept, usn: 'ALUEEE0005' });
    })();
    await Student.updateOne({ _id: s2.profile._id }, { $set: { isAlumni: true } });
    const rec = await request(app).post(`/api/v1/students/${s2.profile._id}/graduate`).set(hA).send({ graduationYear: 2024 });
    expect(rec.status).toBe(200);
    expect(rec.body.data.recovered).toBe(true);
    expect((await request(app).post(`/api/v1/students/${s2.profile._id}/graduate`).set(hA).send({ graduationYear: 2024 })).status).toBe(400);
  });

  test('graduation stays ADMIN-only', async () => {
    const { facUser, a, ownerA } = await seed();
    expect((await graduate(facUser, a.profile._id)).status).toBe(403);
    expect((await graduate(ownerA, a.profile._id)).status).toBe(403);
  });
});
