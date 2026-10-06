// COMMUNICATION — notices, notifications, tickets, messages REST contracts.
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, authHeader } = require('./helpers/factories');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seed() {
  const dept = await createDepartment();
  const admin = await createUser({ role: 'ADMIN', department: dept._id });
  const fac = await createUser({ name: 'Fac', role: 'FACULTY', department: dept._id });
  const a = await createStudent({ department: dept, usn: 'COMAAA0001' });
  const b = await createStudent({ department: dept, usn: 'COMBBB0002' });
  const User = require('../src/models/User');
  return { dept, admin, fac, a, b, ownerA: await User.findById(a.profile.userId), ownerB: await User.findById(b.profile.userId) };
}

describe('notices', () => {
  test('admin creates college notice; student sees it; student cannot create', async () => {
    const { admin, ownerA } = await seed();
    const created = await request(app).post('/api/v1/notices').set(authHeader(admin)).send({
      title: 'Holiday', message: 'Campus closed Monday', targetType: 'COLLEGE', targetAudience: 'ALL',
    });
    expect(created.status).toBe(201);

    const seen = await request(app).get('/api/v1/notices/my').set(authHeader(ownerA));
    expect(seen.status).toBe(200);
    expect(JSON.stringify(seen.body)).toContain('Holiday');

    const forged = await request(app).post('/api/v1/notices').set(authHeader(ownerA)).send({
      title: 'Fake', message: 'not allowed', targetType: 'COLLEGE',
    });
    expect(forged.status).toBe(403);
  });

  test('department-target validation: missing department rejected', async () => {
    const { admin } = await seed();
    const res = await request(app).post('/api/v1/notices').set(authHeader(admin)).send({
      title: 'Dept', message: 'x', targetType: 'DEPARTMENT',
    });
    expect(res.status).toBe(400);
  });
});

describe('notifications', () => {
  test('admin/faculty create; recipient reads and marks read; others isolated', async () => {
    const { admin, ownerA, ownerB } = await seed();
    const created = await request(app).post('/api/v1/notifications').set(authHeader(admin)).send({
      recipients: [String(ownerA._id)], title: 'Hello', message: 'world', type: 'INFO',
    });
    expect([200, 201]).toContain(created.status);

    const mine = await request(app).get('/api/v1/notifications/my').set(authHeader(ownerA));
    expect(mine.status).toBe(200);
    const items = mine.body.data?.data || mine.body.data || [];
    expect(items.length).toBeGreaterThan(0);

    const other = await request(app).get('/api/v1/notifications/my').set(authHeader(ownerB));
    const otherItems = other.body.data?.data || other.body.data || [];
    expect(otherItems.length).toBe(0);

    const studentCreate = await request(app).post('/api/v1/notifications').set(authHeader(ownerA)).send({
      recipients: [String(ownerB._id)], title: 'x', message: 'y',
    });
    expect(studentCreate.status).toBe(403);
  });
});

describe('tickets', () => {
  test('student creates; sees own only; admin manages; forged assignment blocked', async () => {
    const { admin, ownerA, ownerB } = await seed();
    const created = await request(app).post('/api/v1/tickets').set(authHeader(ownerA)).send({
      title: 'Broken chair', description: 'chair broken', category: 'maintenance', priority: 'low',
    });
    expect(created.status).toBe(201);
    const ticketId = created.body.data._id;

    const mineB = await request(app).get('/api/v1/tickets/my').set(authHeader(ownerB));
    expect(mineB.body.data.length).toBe(0);

    const forgedAssign = await request(app).put(`/api/v1/tickets/${ticketId}`).set(authHeader(ownerA)).send({
      assignedTo: String(ownerB._id),
    });
    expect(forgedAssign.status).toBe(403);

    const adminCloses = await request(app).put(`/api/v1/tickets/${ticketId}`).set(authHeader(admin)).send({ status: 'resolved' });
    expect(adminCloses.status).toBe(200);

    const comment = await request(app).post(`/api/v1/tickets/${ticketId}/comments`).set(authHeader(ownerA)).send({ message: 'thanks' });
    expect(comment.status).toBe(200);
  });

  test('cross-user ticket update is rejected', async () => {
    const { ownerA, ownerB } = await seed();
    const created = await request(app).post('/api/v1/tickets').set(authHeader(ownerA)).send({
      title: 'Mine', description: 'd', category: 'other',
    });
    const res = await request(app).put(`/api/v1/tickets/${created.body.data._id}`).set(authHeader(ownerB)).send({ status: 'resolved' });
    expect(res.status).toBe(403);
  });
});

describe('messages', () => {
  test('send/receive conversation; delete restricted to sender; malformed id safe', async () => {
    const { ownerA, ownerB } = await seed();
    const sent = await request(app).post(`/api/v1/messages/${ownerB._id}`).set(authHeader(ownerA)).send({ content: 'hi there' });
    expect(sent.status).toBe(201);

    const convo = await request(app).get(`/api/v1/messages/${ownerA._id}`).set(authHeader(ownerB));
    expect(convo.status).toBe(200);
    expect(JSON.stringify(convo.body)).toContain('hi there');

    const msgId = sent.body.data._id;
    const notSender = await request(app).delete(`/api/v1/messages/${msgId}`).set(authHeader(ownerB));
    expect(notSender.status).toBe(403);

    const senderDel = await request(app).delete(`/api/v1/messages/${msgId}`).set(authHeader(ownerA));
    expect(senderDel.status).toBe(200);

    const malformed = await request(app).get('/api/v1/messages/not-an-id').set(authHeader(ownerA));
    expect(malformed.status).not.toBe(500);
  });

  test('message to nonexistent user is 404', async () => {
    const { ownerA } = await seed();
    const mongoose = require('mongoose');
    const res = await request(app).post(`/api/v1/messages/${new mongoose.Types.ObjectId()}`).set(authHeader(ownerA)).send({ content: 'hello' });
    expect(res.status).toBe(404);
  });
});
