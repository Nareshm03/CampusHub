// Central redaction for anything persisted to logs or the AuditLog
// collection. Never store: passwords/hashes, JWTs/tokens, OTP/2FA codes,
// Authorization headers, SMTP/Mongo/Stripe credentials, payment secrets.
const REDACTED = '[REDACTED]';
const MAX_DEPTH = 10;

// Normalized (lowercase, separators stripped) key fragments that always
// indicate sensitive material.
const SENSITIVE_FRAGMENTS = [
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'otp',
  'twofactor',
  'totp',
  'apikey',
  'privatekey',
  'clientsecret',
  'credential',
  'cookie',
  'sessiontoken',
  'stripesecret',
  'webhooksecret'
];

const normalizeKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, '');

const isSensitiveKey = (key) => {
  const n = normalizeKey(key);
  return SENSITIVE_FRAGMENTS.some((frag) => n.includes(frag));
};

const redact = (value, depth = 0, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    // Scrub embedded bearer credentials that sometimes travel in strings.
    if (/bearer\s+[A-Za-z0-9\-._~+/=]+/i.test(value)) return REDACTED;
    return value;
  }
  if (typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return REDACTED;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1, seen));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = isSensitiveKey(k) ? REDACTED : redact(v, depth + 1, seen);
  }
  return out;
};

module.exports = { redact, REDACTED, isSensitiveKey };
