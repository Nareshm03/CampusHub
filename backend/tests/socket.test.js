// SOCKET.IO — authenticated connection, room isolation, send/receive,
// fan-out, read receipts, session isolation. Real server + real clients.
const http = require('http');
const { Server } = require('socket.io');
const { io: clientIO } = require('socket.io-client');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser } = require('./helpers/factories');
const { initializeSocket } = require('../src/config/socket');
const Message = require('../src/models/Message');

let httpServer;
let port;
let sockets = [];

beforeAll(async () => {
  await connectTestDB();
  httpServer = http.createServer();
  initializeSocket(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  port = httpServer.address().port;
});

beforeEach(clearTestDB);

afterEach(async () => {
  for (const s of sockets) {
    if (s.connected) s.disconnect();
  }
  sockets = [];
});

afterAll(async () => {
  await disconnectTestDB();
  await new Promise((resolve) => httpServer.close(resolve));
});

function connect(token) {
  return new Promise((resolve, reject) => {
    const s = clientIO(`http://127.0.0.1:${port}`, { auth: { token }, reconnection: false, timeout: 5000 });
    sockets.push(s);
    s.on('connect', () => resolve(s));
    s.on('connect_error', (err) => reject(err));
  });
}

function connectExpectError(token) {
  return new Promise((resolve) => {
    const s = clientIO(`http://127.0.0.1:${port}`, { auth: token ? { token } : {}, reconnection: false, timeout: 5000 });
    sockets.push(s);
    s.on('connect', () => resolve(null));
    s.on('connect_error', (err) => resolve(err));
  });
}

function once(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });
}

describe('socket.io', () => {
  test('unauthenticated and invalid tokens are rejected', async () => {
    const dept = await createDepartment();
    const user = await createUser({ role: 'STUDENT', department: dept._id });
    expect(await connectExpectError(null)).toBeTruthy();
    expect(await connectExpectError('garbage.token.here')).toBeTruthy();
    // Sanity: valid token connects
    const s = await connect(user.getSignedJwtToken());
    expect(s.connected).toBe(true);
  });

  test('message fan-out reaches conversation members only', async () => {
    const dept = await createDepartment();
    const a = await createUser({ name: 'SA', role: 'STUDENT', department: dept._id });
    const b = await createUser({ name: 'SB', role: 'STUDENT', department: dept._id });
    const c = await createUser({ name: 'SC', role: 'STUDENT', department: dept._id });
    const [sa, sb, sc] = await Promise.all([connect(a.getSignedJwtToken()), connect(b.getSignedJwtToken()), connect(c.getSignedJwtToken())]);

    sa.emit('join_conversation', String(b._id));
    sb.emit('join_conversation', String(a._id));
    await new Promise((r) => setTimeout(r, 200));

    const cHeard = [];
    sc.on('new_message', (m) => cHeard.push(m));
    sc.on('message_notification', (m) => cHeard.push(m));

    const bMsg = once(sb, 'new_message');
    const bNotif = once(sb, 'message_notification');
    sa.emit('send_message', { receiverId: String(b._id), content: 'hello-b' });

    const msg = await bMsg;
    expect(msg.content).toBe('hello-b');
    const notif = await bNotif;
    expect(notif.message.content).toBe('hello-b');

    await new Promise((r) => setTimeout(r, 400));
    expect(cHeard.length).toBe(0); // room isolation: outsider hears nothing

    const stored = await Message.findOne({ sender: a._id, receiver: b._id });
    expect(stored.content).toBe('hello-b');
  });

  test('read receipts update the database and notify the sender', async () => {
    const dept = await createDepartment();
    const a = await createUser({ name: 'RA', role: 'STUDENT', department: dept._id });
    const b = await createUser({ name: 'RB', role: 'STUDENT', department: dept._id });
    const [sa, sb] = await Promise.all([connect(a.getSignedJwtToken()), connect(b.getSignedJwtToken())]);
    sa.emit('join_conversation', String(b._id));
    sb.emit('join_conversation', String(a._id));
    await new Promise((r) => setTimeout(r, 200));

    sa.emit('send_message', { receiverId: String(b._id), content: 'read-me' });
    await once(sb, 'new_message');

    const readNotice = once(sa, 'messages_read');
    sb.emit('mark_read', { senderId: String(a._id) });
    const notice = await readNotice;
    expect(String(notice.readBy)).toBe(String(b._id));
    expect(await Message.countDocuments({ sender: a._id, receiver: b._id, isRead: true })).toBe(1);
  });

  test('invalid payloads emit errors without crashing; disconnect notifies', async () => {
    const dept = await createDepartment();
    const a = await createUser({ name: 'DA', role: 'STUDENT', department: dept._id });
    const b = await createUser({ name: 'DB', role: 'STUDENT', department: dept._id });
    const [sa, sb] = await Promise.all([connect(a.getSignedJwtToken()), connect(b.getSignedJwtToken())]);

    const err = once(sa, 'error');
    sa.emit('send_message', { receiverId: String(b._id), content: '   ' });
    expect((await err).message).toBeTruthy();
    expect(sa.connected).toBe(true); // server survived

    const offline = once(sb, 'user_status_change');
    sa.disconnect();
    const status = await offline;
    expect(String(status.userId)).toBe(String(a._id));
    expect(status.status).toBe('offline');
  });
});
