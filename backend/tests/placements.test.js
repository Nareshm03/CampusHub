// PLACEMENTS — visibility, eligibility, applications, readiness, skills, perms.
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
  const a = await createStudent({ department: dept, usn: 'PLCAAA0001', semester: 6 });
  const b = await createStudent({ department: dept, usn: 'PLCBBB0002', semester: 2 });
  return { dept, admin, facUser, a, b, ownerA: await User.findById(a.profile.userId), ownerB: await User.findById(b.profile.userId) };
}

async function createCompany(admin, name = 'Acme Corp') {
  const res = await request(app).post('/api/v1/placements/companies').set(authHeader(admin)).send({
    name, email: 'hr@acme.test', industry: 'IT/Software',
  });
  return res.body.data;
}

async function createJob(facUser, companyId, dept, overrides = {}) {
  const res = await request(app).post('/api/v1/placements/jobs').set(authHeader(facUser)).send({
    company: companyId,
    title: 'SDE Intern',
    description: 'Internship role',
    jobType: 'Internship',
    status: 'Published',
    applicationDeadline: new Date(Date.now() + 30 * 864e5).toISOString(),
    eligibility: { departments: [String(dept._id)], semesters: [6] },
    ...overrides,
  });
  return res;
}

describe('placements', () => {
  test('faculty creates company+job; student cannot create; validation enforced', async () => {
    const { dept, admin, facUser, ownerA } = await seed();
    const company = await createCompany(admin);
    expect(company._id).toBeTruthy();

    const job = await createJob(facUser, company._id, dept);
    expect(job.status).toBe(201);
    expect(job.body.data.postedBy).toBe(String(facUser._id)); // server-assigned

    const studentCreate = await request(app).post('/api/v1/placements/jobs').set(authHeader(ownerA)).send({ title: 'x' });
    expect(studentCreate.status).toBe(403);

    const bad = await request(app).post('/api/v1/placements/jobs').set(authHeader(facUser)).send({ title: 'incomplete' });
    expect(bad.status).toBe(400);
  });

  test('eligible student applies; duplicate blocked; ineligible rejected; draft closed', async () => {
    const { dept, admin, facUser, a, ownerA, ownerB } = await seed();
    const company = await createCompany(admin);
    const job = await createJob(facUser, company._id, dept);
    const jobId = job.body.data._id;

    // Give A a CGPA above the default 6.0 gate via a real marks row
    const sem6 = await createSubject({ name: 'Sem6 Sub', code: 'CS601', department: dept, semester: 6, credits: 4, faculty: facUser._id });
    await request(app).post('/api/v1/marks/entry').set(authHeader(facUser)).send({
      marks: [{ studentId: String(a.profile._id), subjectId: String(sem6._id), examType: 'EXTERNAL', examName: 'Final', marks: 80, maxMarks: 100, grade: 'A' }],
    });

    const apply = await request(app).post(`/api/v1/placements/jobs/${jobId}/apply`).set(authHeader(ownerA))
      .field('coverNote', 'interested');
    expect([200, 201]).toContain(apply.status);

    const dup = await request(app).post(`/api/v1/placements/jobs/${jobId}/apply`).set(authHeader(ownerA));
    expect(dup.status).toBe(400);

    // Semester 2 student is outside eligibility semesters [6]
    const inelig = await request(app).post(`/api/v1/placements/jobs/${jobId}/apply`).set(authHeader(ownerB));
    expect([400, 403]).toContain(inelig.status);

    const draft = await createJob(facUser, company._id, dept, { status: 'Draft', title: 'Draft role' });
    const closed = await request(app).post(`/api/v1/placements/jobs/${draft.body.data._id}/apply`).set(authHeader(ownerA));
    expect(closed.status).toBe(400);

    const mine = await request(app).get('/api/v1/placements/my-applications').set(authHeader(ownerA));
    expect(mine.status).toBe(200);
  });

  test('readiness and skills are self-scoped; faculty views via scoped route', async () => {
    const { dept, admin, facUser, a, ownerA, ownerB } = await seed();
    const upd = await request(app).put('/api/v1/placements/skills/me').set(authHeader(ownerA)).send({
      skills: ['JavaScript', 'Node.js'],
    });
    expect([200, 201]).toContain(upd.status);

    const mine = await request(app).get('/api/v1/placements/skills/me').set(authHeader(ownerA));
    expect(mine.status).toBe(200);
    expect(JSON.stringify(mine.body)).toContain('JavaScript');

    // Student role cannot use the faculty-scoped route at all
    const cross = await request(app).get(`/api/v1/placements/skills/student/${a.profile._id}`).set(authHeader(ownerB));
    expect(cross.status).toBe(403);

    const scoped = await request(app).get(`/api/v1/placements/skills/student/${a.profile._id}`).set(authHeader(facUser));
    expect(scoped.status).toBe(200);

    const readiness = await request(app).get('/api/v1/placements/readiness/me').set(authHeader(ownerA));
    expect(readiness.status).toBe(200);
    expect(JSON.stringify(readiness.body)).not.toContain('NaN');

    const company = await createCompany(admin);
    const job = await createJob(facUser, company._id, dept);
    const adminDel = await request(app).delete(`/api/v1/placements/jobs/${job.body.data._id}`).set(authHeader(admin));
    expect([200, 204]).toContain(adminDel.status);

    const facDel = await request(app).delete(`/api/v1/placements/jobs/${(await createJob(facUser, company._id, dept)).body.data._id}`).set(authHeader(facUser));
    expect(facDel.status).toBe(403); // delete is admin-only
  });
});
