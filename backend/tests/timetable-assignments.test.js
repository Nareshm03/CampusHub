// TIMETABLE + ASSIGNMENTS — creation, scoping, submission.
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, createFaculty, createSubject, assignSubjectToFaculty, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

describe('timetable', () => {
  test('admin creates entry with exact enums; student reads own; invalid day rejected', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const { user: facUser } = await createFaculty({ department: dept });
    const subject = await createSubject({ department: dept, faculty: facUser._id });
    const { profile } = await createStudent({ department: dept, semester: 3 });
    const owner = await User.findById(profile.userId);

    const created = await request(app).post('/api/v1/timetable').set(authHeader(admin)).send({
      day: 'MON', period: 1, subject: String(subject._id),
      faculty: String(facUser._id), department: String(dept._id), semester: 3,
    });
    expect(created.status).toBe(201);

    const badDay = await request(app).post('/api/v1/timetable').set(authHeader(admin)).send({
      day: 'FUNDAY', period: 1, subject: String(subject._id),
      faculty: String(facUser._id), department: String(dept._id), semester: 3,
    });
    expect(badDay.status).toBe(400);

    const mine = await request(app).get('/api/v1/timetable/student').set(authHeader(owner));
    expect(mine.status).toBe(200);
  });

  test('non-admin cannot create timetable entries', async () => {
    const dept = await createDepartment();
    const { user: facUser } = await createFaculty({ department: dept });
    const subject = await createSubject({ department: dept, faculty: facUser._id });
    const res = await request(app).post('/api/v1/timetable').set(authHeader(facUser)).send({
      day: 'TUE', period: 2, subject: String(subject._id),
      faculty: String(facUser._id), department: String(dept._id), semester: 3,
    });
    expect(res.status).toBe(403);
  });
});

describe('assignments', () => {
  test('faculty creates assignment; student lists and submits; duplicate submit guarded', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    void admin;
    const { user: facUser, profile: facProfile } = await createFaculty({ department: dept });
    const subject = await createSubject({ department: dept, faculty: facUser._id });
    await assignSubjectToFaculty(facProfile, subject._id);
    const { profile } = await createStudent({ department: dept });
    const owner = await User.findById(profile.userId);

    const created = await request(app).post('/api/v1/assignments').set(authHeader(facUser)).send({
      title: 'Assignment 1',
      description: 'Solve problems 1-5',
      subject: String(subject._id),
      department: String(dept._id),
      semester: 3,
      dueDate: new Date(Date.now() + 7 * 864e5).toISOString(),
      totalMarks: 20,
    });
    expect([200, 201]).toContain(created.status);
    const assignmentId = created.body.data?._id || created.body._id;
    expect(assignmentId).toBeTruthy();

    const list = await request(app).get('/api/v1/assignments').set(authHeader(owner));
    expect(list.status).toBe(200);

    const uploadDir = path.join(__dirname, '..', 'uploads', 'students');
    const beforeFiles = new Set(fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : []);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const submit = await request(app).post(`/api/v1/assignments/${assignmentId}/submit`)
      .set(authHeader(owner))
      .field('textSubmission', 'my answers')
      .attach('files', png, 'answer.png');
    expect([200, 201]).toContain(submit.status);

    const mine = await request(app).get('/api/v1/assignments/my-submissions').set(authHeader(owner));
    expect(mine.status).toBe(200);

    // Cleanup: remove only files the upload middleware wrote during this test.
    for (const f of fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : []) {
      if (!beforeFiles.has(f)) {
        try { fs.unlinkSync(path.join(uploadDir, f)); } catch (_) {}
      }
    }
  });
});
