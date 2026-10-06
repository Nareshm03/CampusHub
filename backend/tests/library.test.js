// LIBRARY — physical issue/return/availability + digital access restrictions.
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');
const Library = require('../src/models/Library');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seed() {
  const dept = await createDepartment();
  const admin = await createUser({ role: 'ADMIN', department: dept._id });
  const a = await createStudent({ department: dept, usn: 'LIBAAA0001' });
  const b = await createStudent({ department: dept, usn: 'LIBBBB0002' });
  return { dept, admin, a, b, ownerA: await User.findById(a.profile.userId), ownerB: await User.findById(b.profile.userId) };
}

describe('physical library', () => {
  test('admin adds book; student cannot; missing fields rejected', async () => {
    const { admin, ownerA } = await seed();
    const added = await request(app).post('/api/v1/library/books').set(authHeader(admin)).send({
      title: 'Clean Code', author: 'R. Martin', isbn: 'ISBN-1', totalCopies: 1,
    });
    expect(added.status).toBe(201);

    const denied = await request(app).post('/api/v1/library/books').set(authHeader(ownerA)).send({ title: 'X', author: 'Y' });
    expect(denied.status).toBe(403);

    const bad = await request(app).post('/api/v1/library/books').set(authHeader(admin)).send({ title: '' });
    expect(bad.status).toBe(400);
  });

  test('issue decrements availability; double-issue and zero-stock rejected; return restores', async () => {
    const { admin, a, b, ownerA, ownerB } = await seed();
    const added = await request(app).post('/api/v1/library/books').set(authHeader(admin)).send({
      title: 'Single Copy', author: 'Auth', totalCopies: 1,
    });
    const bookId = added.body.data._id;

    const issue = await request(app).post('/api/v1/library/issue').set(authHeader(admin)).send({
      bookId, studentId: String(a.profile._id), dueDate: new Date(Date.now() + 7 * 864e5).toISOString(),
    });
    expect(issue.status).toBe(200);
    expect((await Library.findById(bookId)).book.availableCopies).toBe(0);

    const dup = await request(app).post('/api/v1/library/issue').set(authHeader(admin)).send({
      bookId, studentId: String(a.profile._id), dueDate: new Date(Date.now() + 7 * 864e5).toISOString(),
    });
    expect(dup.status).toBe(400);

    const noStock = await request(app).post('/api/v1/library/issue').set(authHeader(admin)).send({
      bookId, studentId: String(b.profile._id), dueDate: new Date(Date.now() + 7 * 864e5).toISOString(),
    });
    expect(noStock.status).toBe(400);

    const mine = await request(app).get('/api/v1/library/my-books').set(authHeader(ownerA));
    expect(mine.status).toBe(200);
    const other = await request(app).get('/api/v1/library/my-books').set(authHeader(ownerB));
    expect(JSON.stringify(other.body)).not.toContain('Single Copy');

    const txnId = (await Library.findById(bookId)).transactions[0]._id;
    const ret = await request(app).post(`/api/v1/library/return/${txnId}`).set(authHeader(admin));
    expect(ret.status).toBe(200);
    expect((await Library.findById(bookId)).book.availableCopies).toBe(1);

    const retAgain = await request(app).post(`/api/v1/library/return/${txnId}`).set(authHeader(admin));
    expect(retAgain.status).toBe(400);
  });

  test('issue validates ids; student cannot issue', async () => {
    const { admin, a, ownerA } = await seed();
    const added = await request(app).post('/api/v1/library/books').set(authHeader(admin)).send({ title: 'T', author: 'A' });
    const bad = await request(app).post('/api/v1/library/issue').set(authHeader(admin)).send({
      bookId: 'nope', studentId: String(a.profile._id), dueDate: new Date().toISOString(),
    });
    expect(bad.status).not.toBe(500);

    const forbidden = await request(app).post('/api/v1/library/issue').set(authHeader(ownerA)).send({
      bookId: added.body.data._id, studentId: String(a.profile._id), dueDate: new Date().toISOString(),
    });
    expect(forbidden.status).toBe(403);
  });
});

describe('digital library', () => {
  test('student cannot upload; catalog lists; unknown download is 404', async () => {
    const { admin, ownerA } = await seed();
    const denied = await request(app).post('/api/v1/digital-library/books').set(authHeader(ownerA))
      .field('title', 'X').field('author', 'Y').attach('file', Buffer.from('x'), 'x.pdf');
    expect(denied.status).toBe(403);

    const list = await request(app).get('/api/v1/digital-library/books').set(authHeader(ownerA));
    expect(list.status).toBe(200);

    const mongoose = require('mongoose');
    const missing = await request(app).get(`/api/v1/digital-library/books/${new mongoose.Types.ObjectId()}/download`).set(authHeader(ownerA));
    expect(missing.status).toBe(404);

    const malformed = await request(app).get('/api/v1/digital-library/books/nope/download').set(authHeader(admin));
    expect(malformed.status).not.toBe(500);
  });
});
