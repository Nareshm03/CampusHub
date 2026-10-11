// LOGGING REDACTION — secrets must never persist in logs or AuditLog rows.
const express = require('express');
const request = require('supertest');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { redact, REDACTED } = require('../src/utils/redact');
const AuditLogger = require('../src/utils/auditLogger');
const AuditLog = require('../src/models/AuditLog');
const { auditLogger } = require('../src/middleware/auditLogger');

beforeAll(connectTestDB);
beforeEach(clearTestDB);
afterAll(disconnectTestDB);

describe('redact()', () => {
  test('redacts sensitive keys at any depth, preserves the rest', () => {
    const out = redact({
      name: 'Ada',
      password: 'hunter2',
      nested: { twoFactorToken: '123456', ok: true },
      list: [{ apiKey: 'k' }, { count: 2 }],
      Authorization: 'Bearer abc.def.ghi'
    });
    expect(out.name).toBe('Ada');
    expect(out.password).toBe(REDACTED);
    expect(out.nested.twoFactorToken).toBe(REDACTED);
    expect(out.nested.ok).toBe(true);
    expect(out.list[0].apiKey).toBe(REDACTED);
    expect(out.list[1].count).toBe(2);
    expect(out.Authorization).toBe(REDACTED);
  });

  test('matches separator/case variants and bearer strings', () => {
    expect(redact({ 'api-key': 'x' })['api-key']).toBe(REDACTED);
    expect(redact({ PassWord: 'x' }).PassWord).toBe(REDACTED);
    expect(redact({ note: 'call Bearer abc.def.ghi now' }).note).toBe(REDACTED);
    expect(redact({ transactionId: 'TX-1' }).transactionId).toBe('TX-1');
    expect(redact({ paymentMethod: 'CASH' }).paymentMethod).toBe('CASH');
  });

  test('handles circular structures without throwing', () => {
    const a = { password: 'x' };
    a.self = a;
    expect(() => redact(a)).not.toThrow();
    expect(redact(a).password).toBe(REDACTED);
  });
});

describe('audit persistence redaction', () => {
  test('AuditLogger.log strips secrets from details/metadata/changes', async () => {
    const saved = await AuditLogger.log({
      userId: undefined,
      action: 'MARKS_UPDATED',
      entityType: 'Marks',
      details: { password: 'p', nested: { token: 't' } },
      metadata: { otp: '999999', role: 'ADMIN' },
      changes: { before: { secret: 's' }, after: { ok: 1 } }
    });
    expect(saved).toBeTruthy();
    const row = await AuditLog.findById(saved._id).lean();
    expect(JSON.stringify(row)).not.toMatch(/hunter2|"p"|"t"|999999|"s"/);
    expect(row.metadata.role).toBe('ADMIN');
  });

  test('generic auditLogger middleware redacts request bodies', async () => {
    const mini = express();
    mini.use(express.json());
    mini.post('/probe', auditLogger('ATTENDANCE_MARKED', 'LOW'), (req, res) => res.json({ ok: true }));
    const res = await request(mini).post('/probe').send({ name: 'x', password: 'hunter2', twoFactorToken: '111111' });
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 300));
    const rows = await AuditLog.find({ action: 'ATTENDANCE_MARKED' }).lean();
    expect(rows.length).toBe(1);
    expect(JSON.stringify(rows[0])).not.toMatch(/hunter2|111111/);
    expect(rows[0].metadata.requestBody.name).toBe('x');
  });
});
