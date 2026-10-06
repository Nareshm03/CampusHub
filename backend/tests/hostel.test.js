// HOSTEL — booking, capacity, allocation, deallocation, ownership.
const request = require('supertest');
const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, authHeader } = require('./helpers/factories');
const User = require('../src/models/User');

const app = buildTestApp();

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

async function seedHostel(admin, rooms = [{ number: '101', rent: 5000, capacity: 2 }]) {
  const res = await request(app).post('/api/v1/hostel/admin/hostels').set(authHeader(admin)).send({
    name: 'Hostel A', type: 'BOYS', rooms,
  });
  return res.body.data;
}

describe('hostel', () => {
  test('admin creates hostel; invalid type rejected; student cannot', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const { user: stud } = await createStudent({ department: dept });

    const ok = await request(app).post('/api/v1/hostel/admin/hostels').set(authHeader(admin)).send({
      name: 'H1', type: 'BOYS', rooms: [{ number: '101', rent: 5000, capacity: 2 }],
    });
    expect(ok.status).toBe(201);

    const badType = await request(app).post('/api/v1/hostel/admin/hostels').set(authHeader(admin)).send({ name: 'H2', type: 'COED' });
    expect(badType.status).toBe(400);

    const denied = await request(app).post('/api/v1/hostel/admin/hostels').set(authHeader(stud)).send({ name: 'H3', type: 'GIRLS' });
    expect(denied.status).toBe(403);
  });

  test('booking lifecycle: request, duplicate blocked, approve, check-in, my-room, cancel rules', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const hostel = await seedHostel(admin);
    const a = await createStudent({ department: dept, usn: 'HOSAAA0001' });
    const ownerA = await User.findById(a.profile.userId);

    const dates = { moveInDate: '2026-11-01', checkOutDate: '2027-05-31' };
    const book = await request(app).post('/api/v1/hostel/book').set(authHeader(ownerA)).send({
      hostelId: hostel._id, roomNumber: '101', ...dates,
    });
    expect(book.status).toBe(201);
    const bookingId = book.body.data._id;

    const dup = await request(app).post('/api/v1/hostel/book').set(authHeader(ownerA)).send({
      hostelId: hostel._id, roomNumber: '101', ...dates,
    });
    expect(dup.status).toBe(400);

    const badDates = await request(app).post('/api/v1/hostel/book').set(authHeader(ownerA)).send({
      hostelId: hostel._id, roomNumber: '101', moveInDate: '2027-05-31', checkOutDate: '2026-11-01',
    });
    expect(badDates.status).toBe(400);

    const mine = await request(app).get('/api/v1/hostel/my-room').set(authHeader(ownerA));
    expect(mine.status).toBe(200);
    expect(mine.body.type).toBe('booking');

    const approve = await request(app).put(`/api/v1/hostel/admin/bookings/${bookingId}`).set(authHeader(admin)).send({ status: 'APPROVED' });
    expect(approve.status).toBe(200);

    const badStatus = await request(app).put(`/api/v1/hostel/admin/bookings/${bookingId}`).set(authHeader(admin)).send({ status: 'FLYING' });
    expect(badStatus.status).toBe(400);

    const checkin = await request(app).put(`/api/v1/hostel/admin/bookings/${bookingId}`).set(authHeader(admin)).send({ status: 'CHECKED_IN' });
    expect(checkin.status).toBe(200);

    const cancelLocked = await request(app).put(`/api/v1/hostel/booking/${bookingId}/cancel`).set(authHeader(ownerA));
    expect(cancelLocked.status).toBe(400);
  });

  test('capacity enforced; cross-student cancel rejected; delete guards', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const hostel = await seedHostel(admin, [{ number: '201', rent: 4000, capacity: 1 }]);
    const a = await createStudent({ department: dept, usn: 'HOSAAA0002' });
    const b = await createStudent({ department: dept, usn: 'HOSBBB0003' });
    const ownerA = await User.findById(a.profile.userId);
    const ownerB = await User.findById(b.profile.userId);
    const dates = { moveInDate: '2026-11-01', checkOutDate: '2027-05-31' };

    const ba = await request(app).post('/api/v1/hostel/book').set(authHeader(ownerA)).send({ hostelId: hostel._id, roomNumber: '201', ...dates });
    await request(app).put(`/api/v1/hostel/admin/bookings/${ba.body.data._id}`).set(authHeader(admin)).send({ status: 'CHECKED_IN' });

    const bb = await request(app).post('/api/v1/hostel/book').set(authHeader(ownerB)).send({ hostelId: hostel._id, roomNumber: '201', ...dates });
    expect(bb.status).toBe(400); // fully occupied

    const crossCancel = await request(app).put(`/api/v1/hostel/booking/${ba.body.data._id}/cancel`).set(authHeader(ownerB));
    expect(crossCancel.status).toBe(404); // scoped to own bookings

    const delBlocked = await request(app).delete(`/api/v1/hostel/admin/hostels/${hostel._id}`).set(authHeader(admin));
    expect(delBlocked.status).toBe(400);
  });

  test('available rooms reflect occupancy; admin stats consistent', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    await seedHostel(admin);
    const rooms = await request(app).get('/api/v1/hostel/rooms/available').set(authHeader(admin));
    expect(rooms.status).toBe(200);
    expect(rooms.body.data.length).toBe(1);

    const stats = await request(app).get('/api/v1/hostel/admin/stats').set(authHeader(admin));
    expect(stats.status).toBe(200);
    expect(stats.body.data.totalCapacity).toBe(2);
    expect(stats.body.data.availableSpots).toBe(2);
  });
});
