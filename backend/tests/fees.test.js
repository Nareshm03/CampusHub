// FEES — active contract only: records, ownership, safe payment transitions.
// No Stripe success is faked: gateway paths are exercised for validation
// errors only.
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');
const Fee = require('../src/models/Fee');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seed() {
  const dept = await createDepartment();
  const admin = await createUser({ role: 'ADMIN', department: dept._id });
  const a = await createStudent({ department: dept, usn: 'FEEAAA0001' });
  const b = await createStudent({ department: dept, usn: 'FEEBBB0002' });
  return { dept, admin, a, b, ownerA: await User.findById(a.profile.userId), ownerB: await User.findById(b.profile.userId) };
}

async function createFeeRecord(admin, studentProfileId, overrides = {}) {
  const res = await request(app).post('/api/v1/fees').set(authHeader(admin)).send({
    student: String(studentProfileId),
    semester: 3,
    academicYear: '2024-2025',
    tuitionFee: 50000,
    examFee: 2000,
    dueDate: new Date(Date.now() + 30 * 864e5).toISOString(),
    ...overrides,
  });
  return res;
}

describe('fees', () => {
  test('admin creates fee; duplicate per student/semester/year rejected', async () => {
    const { admin, a } = await seed();
    const first = await createFeeRecord(admin, a.profile._id);
    expect(first.status).toBe(201);
    expect(first.body.data.totalAmount).toBe(52000);

    const dup = await createFeeRecord(admin, a.profile._id);
    expect(dup.status).toBe(400);

    const unknownStudent = await createFeeRecord(admin, '6ac3c58b55e794a7312c1d41'.replace(/1d41$/, '1d99'));
    expect([400, 404]).toContain(unknownStudent.status);
  });

  test('student sees own fees only; cross-student access rejected', async () => {
    const { admin, a, b, ownerA, ownerB } = await seed();
    await createFeeRecord(admin, a.profile._id);

    const mine = await request(app).get('/api/v1/fees/my').set(authHeader(ownerA));
    expect(mine.status).toBe(200);
    expect(mine.body.data.length).toBe(1);

    const cross = await request(app).get(`/api/v1/fees/student/${b.profile._id}`).set(authHeader(ownerA));
    expect(cross.status).toBe(403);

    const ownParam = await request(app).get(`/api/v1/fees/student/${a.profile._id}`).set(authHeader(ownerA));
    expect(ownParam.status).toBe(200);
  });

  test('recordPayment: partial then full; overpay and double-pay rejected; student forbidden', async () => {
    const { admin, a, ownerA } = await seed();
    const created = await createFeeRecord(admin, a.profile._id);
    const feeId = created.body.data._id;

    const partial = await request(app).post(`/api/v1/fees/${feeId}/payment`).set(authHeader(admin)).send({
      amount: 20000, paymentMethod: 'CASH', transactionId: 'TXN-1',
    });
    expect(partial.status).toBe(200);
    expect(partial.body.data.paidAmount).toBe(20000);
    expect(partial.body.receiptNumber).toBeTruthy();

    const overpay = await request(app).post(`/api/v1/fees/${feeId}/payment`).set(authHeader(admin)).send({
      amount: 999999, paymentMethod: 'CASH',
    });
    expect(overpay.status).toBe(400);

    const negative = await request(app).post(`/api/v1/fees/${feeId}/payment`).set(authHeader(admin)).send({ amount: -5 });
    expect(negative.status).toBe(400);

    const rest = await request(app).post(`/api/v1/fees/${feeId}/payment`).set(authHeader(admin)).send({
      amount: 32000, paymentMethod: 'UPI',
    });
    expect(rest.status).toBe(200);
    expect((await Fee.findById(feeId)).paidAmount).toBe(52000);

    const paid = await request(app).post(`/api/v1/fees/${feeId}/payment`).set(authHeader(admin)).send({ amount: 100 });
    expect(paid.status).toBe(400);

    const studentPay = await request(app).post(`/api/v1/fees/${feeId}/payment`).set(authHeader(ownerA)).send({ amount: 100 });
    expect(studentPay.status).toBe(403);
  });

  test('fee summary is admin-only; payment intent is explicit-mock + ownership-scoped', async () => {
    const { admin, a, b, ownerA, ownerB } = await seed();
    const created = await createFeeRecord(admin, a.profile._id);

    const denied = await request(app).get('/api/v1/fees/summary').set(authHeader(ownerA));
    expect(denied.status).toBe(403);
    const summary = await request(app).get('/api/v1/fees/summary').set(authHeader(admin));
    expect(summary.status).toBe(200);

    // Without Stripe credentials the contract returns an EXPLICIT mock
    // flag (no real charge). Ownership must still hold.
    const intent = await request(app).post(`/api/v1/fees/${created.body.data._id}/create-payment-intent`).set(authHeader(ownerA)).send({ amount: 1000 });
    expect(intent.status).toBe(200);
    expect(intent.body.mock).toBe(true);

    const cross = await request(app).post(`/api/v1/fees/${created.body.data._id}/create-payment-intent`).set(authHeader(ownerB)).send({ amount: 1000 });
    expect(cross.status).toBe(403);
  });
});
