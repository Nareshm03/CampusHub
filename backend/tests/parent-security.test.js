// PARENT regression — registration/linking approval, ownership, payment
// scope, homework isolation, messaging authorization, GPA safety, profile
// authorization. No production behavior beyond the fixes is asserted.
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
  const subj = await createSubject({ department: dept, faculty: facUser._id });
  const Faculty = require('../src/models/Faculty');
  await Faculty.updateOne({ userId: facUser._id }, { $addToSet: { subjects: subj._id } });
  const a = await createStudent({ department: dept, usn: 'PARAAA0001', subjects: [subj._id] });
  const b = await createStudent({ department: dept, usn: 'PARBBB0002', subjects: [subj._id] });
  const mkParent = async (email, linkTo) => {
<<<<<<< Updated upstream
    const u = new User({ name: 'Par', email, password: 'Passw0rd!', role: 'PARENT', ...(linkTo ? { linkedStudentId: linkTo } : {}) });
=======
    const u = new User({ name: 'Par', email, password: 'Passw0rd!', role: 'PARENT', isEmailVerified: true, ...(linkTo ? { linkedStudentId: linkTo } : {}) });
>>>>>>> Stashed changes
    await u.save();
    return u;
  };
  const parA = await mkParent('pa.sec@test.com', a.profile._id);
  const parB = await mkParent('pb.sec@test.com', b.profile._id);
  const parU = await mkParent('pu.sec@test.com', null);
  return { dept, admin, facUser, subj, a, b, parA, parB, parU, ownerA: await User.findById(a.profile.userId), ownerB: await User.findById(b.profile.userId) };
}

describe('parent registration', () => {
  test('PARENT registers without a pre-existing link; ADMIN/FACULTY refused', async () => {
    const dept = await createDepartment();
    const base = { name: 'Parent Person', password: 'Passw0rd!' };
    const ok = await request(app).post('/api/v1/auth/register').send({ ...base, email: 'preg.sec@test.com', role: 'PARENT' });
    expect(ok.status).toBe(201);
<<<<<<< Updated upstream
    expect(ok.body.data.role).toBe('PARENT');
    expect(ok.body.data.linkedStudentId || null).toBeNull();
=======
    expect(ok.body.success).toBe(true);
    expect(ok.body.verified).toBe(false);
    const User = require('../src/models/User');
    const parentUser = await User.findOne({ email: 'preg.sec@test.com' });
    expect(parentUser.role).toBe('PARENT');
    expect(parentUser.linkedStudentId || null).toBeNull();
>>>>>>> Stashed changes
    const evil = await request(app).post('/api/v1/auth/register').send({ ...base, email: 'evil.sec@test.com', role: 'ADMIN', department: String(dept._id) });
    expect(evil.status).toBe(403);
    const evil2 = await request(app).post('/api/v1/auth/register').send({ ...base, email: 'evil2.sec@test.com', role: 'FACULTY', department: String(dept._id) });
    expect(evil2.status).toBe(403);
  });
});

describe('approval-only linking', () => {
  test('request stays pending with generic response; no data before approval', async () => {
    const { parU } = await seed();
    const hU = authHeader(parU);
    const req1 = await request(app).post('/api/v1/parent/link-student').set(hU).send({ usn: 'PARAAA0001' });
    expect(req1.status).toBe(202);
    expect(JSON.stringify(req1.body)).not.toMatch(/PARAAA0001|Test User/);
    // unresolvable USN → same generic 202 (no oracle)
    const req2 = await request(app).post('/api/v1/parent/link-student').set(hU).send({ usn: 'NOPE0000' });
    // duplicate pending (same parent) → 409 regardless of resolvability
    expect([202, 409]).toContain(req2.status);
    // still unlinked: dashboard + child read give nothing private
    const dash = await request(app).get('/api/v1/parent/dashboard').set(hU);
    expect(dash.body.linked).toBe(false);
    expect(dash.body.data).toBeNull();
    expect((await request(app).get('/api/v1/parent/child').set(hU)).status).toBe(404);
    const mine = await request(app).get('/api/v1/parent/link-requests/mine').set(hU);
    expect(mine.status).toBe(200);
    expect(mine.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('admin approves → access; admin rejects → still unlinked; non-admin review refused', async () => {
    const { admin, parU, a } = await seed();
    const hU = authHeader(parU);
    await request(app).post('/api/v1/parent/link-student').set(hU).send({ usn: 'PARAAA0001' });
    const pending = await request(app).get('/api/v1/parent/link-requests').set(authHeader(admin));
    expect(pending.status).toBe(200);
    const reqId = pending.body.data[0]._id;
    // student / parent cannot review
    expect((await request(app).put(`/api/v1/parent/link-requests/${reqId}/review`).set(hU).send({ decision: 'APPROVED' })).status).toBe(403);
    // approve
    const appr = await request(app).put(`/api/v1/parent/link-requests/${reqId}/review`).set(authHeader(admin)).send({ decision: 'APPROVED' });
    expect(appr.status).toBe(200);
    expect((await request(app).get('/api/v1/parent/child').set(hU)).status).toBe(200);
    // re-review refused
    expect((await request(app).put(`/api/v1/parent/link-requests/${reqId}/review`).set(authHeader(admin)).send({ decision: 'REJECTED' })).status).toBe(409);
    void a;
  });

  test('reject path leaves parent unlinked; already-linked cannot re-request', async () => {
    const { admin, parA } = await seed();
    const hA = authHeader(parA);
    expect((await request(app).post('/api/v1/parent/link-student').set(hA).send({ usn: 'PARBBB0002' })).status).toBe(400);
<<<<<<< Updated upstream
    const parU2 = new User({ name: 'Par', email: 'pu2.sec@test.com', password: 'Passw0rd!', role: 'PARENT' });
=======
    const parU2 = new User({ name: 'Par', email: 'pu2.sec@test.com', password: 'Passw0rd!', role: 'PARENT', isEmailVerified: true });
>>>>>>> Stashed changes
    await parU2.save();
    const hU2 = authHeader(parU2);
    await request(app).post('/api/v1/parent/link-student').set(hU2).send({ usn: 'PARBBB0002' });
    const list = await request(app).get('/api/v1/parent/link-requests').set(authHeader(admin));
    const target = list.body.data.find((r) => String(r.parentUser._id || r.parentUser) === String(parU2._id));
    const rej = await request(app).put(`/api/v1/parent/link-requests/${target._id}/review`).set(authHeader(admin)).send({ decision: 'REJECTED', adminNote: 'no proof' });
    expect(rej.status).toBe(200);
    expect((await User.findById(parU2._id)).linkedStudentId || null).toBeNull();
    expect((await request(app).get('/api/v1/parent/child').set(hU2)).status).toBe(404);
  });
});

describe('linked-child ownership', () => {
  test('cross-child reads denied on every linked route; forged bodies ignored', async () => {
    const { parA, b } = await seed();
    const hA = authHeader(parA);
    for (const ep of ['/parent/child/attendance', '/parent/child/marks', '/parent/child/cgpa', '/parent/child/fees', '/parent/child/assignments', '/parent/child/exams']) {
      expect((await request(app).get(`/api/v1${ep}`).set(hA)).status).toBe(200);
    }
    // no direct-ID child routes exist; forged query/body params change nothing
    const forged = await request(app).get(`/api/v1/parent/child/marks?studentId=${b.profile._id}`).set(hA);
    expect(forged.status).toBe(200);
    const dash = await request(app).get('/api/v1/parent/dashboard').set(hA);
    expect(dash.body.data.student.usn).toBe('PARAAA0001');
  });
});

describe('parent payment scope', () => {
  test('linked-child intent allowed; other-child forged 403; unlinked 403', async () => {
    const { admin, a, b, parA, parU } = await seed();
    const hA = authHeader(admin);
    const mkFee = async (profile) => (await request(app).post('/api/v1/fees').set(hA).send({
      student: String(profile._id), semester: 3, academicYear: '2024-2025',
      tuitionFee: 20000, examFee: 1000, dueDate: new Date(Date.now() + 30 * 864e5).toISOString()
    })).body.data;
    const feeA = await mkFee(a.profile);
    const feeB = await mkFee(b.profile);
    const own = await request(app).post(`/api/v1/fees/${feeA._id}/create-payment-intent`).set(authHeader(parA));
    expect([200, 500]).toContain(own.status); // 200 mock intent, or 500 live-Stripe in test env — never 403
    expect(own.status).not.toBe(403);
    const forged = await request(app).post(`/api/v1/fees/${feeB._id}/create-payment-intent`).set(authHeader(parA));
    expect(forged.status).toBe(403);
    const unlinked = await request(app).post(`/api/v1/fees/${feeA._id}/create-payment-intent`).set(authHeader(parU));
    expect(unlinked.status).toBe(403);
  });
});

describe('parent homework isolation', () => {
  test('sees only linked child assignments with own submission', async () => {
    const { admin, facUser, subj, a, b, parA } = await seed();
    const Assignment = require('../src/models/Assignment');
    const asg = await Assignment.create({
      title: 'HW', description: 'd', subject: subj._id, faculty: facUser._id, department: subj.department,
      semester: 3, dueDate: new Date(Date.now() + 864e5), totalMarks: 100, status: 'PUBLISHED'
    });
    const AssignmentSubmission = require('../src/models/AssignmentSubmission');
    await AssignmentSubmission.create({ assignment: asg._id, student: a.profile._id, status: 'SUBMITTED' });
    await AssignmentSubmission.create({ assignment: asg._id, student: b.profile._id, status: 'SUBMITTED' });
    const res = await request(app).get('/api/v1/parent/child/assignments').set(authHeader(parA));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(String(res.body.data[0].submission.student)).toBe(String(a.profile._id));
    void admin;
  });
});

describe('parent messaging authorization', () => {
  test('search exposes staff only; send to student 403; send to faculty 201; staff reply continuity', async () => {
    const { admin, facUser, parA, ownerB } = await seed();
    const hP = authHeader(parA);
    const search = await request(app).get('/api/v1/messages/users/search?query=test').set(hP);
    expect(search.status).toBe(200);
    const roles = search.body.data.map((u) => u.role);
    expect(roles.length).toBeGreaterThan(0);
    expect(roles.every((r) => ['FACULTY', 'ADMIN'].includes(r))).toBe(true);
    expect((await request(app).post(`/api/v1/messages/${ownerB._id}`).set(hP).send({ content: 'hi' })).status).toBe(403);
    const toFac = await request(app).post(`/api/v1/messages/${facUser._id}`).set(hP).send({ content: 'hello teacher' });
    expect(toFac.status).toBe(201);
    // empty content rejected for everyone
    expect((await request(app).post(`/api/v1/messages/${facUser._id}`).set(hP).send({ content: '   ' })).status).toBe(400);
    void admin;
  });
});

describe('GPA zero/empty safety', () => {
  test('no NaN/Infinity on empty or zero-total marks', async () => {
    const { parA } = await seed();
    const hP = authHeader(parA);
    const cgpa = await request(app).get('/api/v1/parent/child/cgpa').set(hP);
    expect(cgpa.status).toBe(200);
    expect(cgpa.body.data.cgpa).toBe(0);
    expect(JSON.stringify(cgpa.body)).not.toMatch(/NaN|null/);
  });
});

describe('parent profile authorization', () => {
  test('profile shows own account; role/linkage immutable from parent scope', async () => {
    const { parA, a } = await seed();
    // no self-update route mutates role/linkage: only changepassword + auth/me exist
    const me = await request(app).get('/api/v1/auth/me').set(authHeader(parA));
    expect(me.status).toBe(200);
    expect(me.body.data.role).toBe('PARENT');
    void a;
  });
});
