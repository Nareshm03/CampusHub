/**
 * Production environment validation — fail fast on insecure/missing config.
 *
 * Development is untouched (external env files / shell env keep working).
 * In production (NODE_ENV === 'production') the process exits(1) with a
 * clear error unless every required security/payment variable is present
 * and free of placeholder values.
 */

const MIN_SECRET_LENGTH = 32;

const SECRET_BLOCKLIST = [
  /generate/i,
  /placeholder/i,
  /changeme/i,
  /change[_-]?this/i,
  /replace[_-]?me/i,
  /your[-_ ]?(secret|key|password|app)/i,
  /example/i,
  /fallback-secret/i,
  /^(test|testing|secret|password|password123|12345|changeme)$/i,
];

const ORIGIN_BLOCKLIST = [
  /yourdomain/i,
  /your[-_]?app/i,
  /example\./i,
  /replace[_-]?me/i,
  /changeme/i,
  /placeholder/i,
  /localhost/i,
  /127\.0\.0\.1/i,
];

const isPlaceholderSecret = (value) => {
  if (!value || typeof value !== 'string') return true;
  const v = value.trim();
  if (v.length < MIN_SECRET_LENGTH) return true;
  return SECRET_BLOCKLIST.some((re) => re.test(v));
};

const originProblems = (value) => {
  const problems = [];
  if (!value || !String(value).trim()) {
    problems.push('must be set (comma-separated frontend origin URL(s))');
    return problems;
  }
  const origins = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    problems.push('must contain at least one origin URL');
    return problems;
  }
  origins.forEach((origin) => {
    if (ORIGIN_BLOCKLIST.some((re) => re.test(origin))) {
      problems.push(`"${origin}" looks like a placeholder/dev origin`);
    } else if (!origin.startsWith('https://')) {
      problems.push(`"${origin}" must use https:// in production`);
    }
  });
  return problems;
};

const expiryProblems = (value) => {
  if (!value) return []; // code default ('30d') applies
  if (/^(\d+[smhd]|\d+)$/.test(String(value).trim())) return [];
  return [`"${value}" must look like 30d, 12h, 60m, or seconds`];
};

const validateProductionEnv = (env = process.env) => {
  const errors = [];

  if (isPlaceholderSecret(env.JWT_SECRET)) {
    errors.push(
      'JWT_SECRET must be set to a long random value (>= 32 chars, no placeholders). Generate with: openssl rand -base64 48'
    );
  }
  if (isPlaceholderSecret(env.SESSION_SECRET)) {
    errors.push(
      'SESSION_SECRET must be set to a long random value (>= 32 chars, no placeholders). Generate with: openssl rand -base64 48'
    );
  }
  if (!env.MONGODB_URI || !String(env.MONGODB_URI).trim()) {
    errors.push('MONGODB_URI must be set to the production database connection string.');
  }
  originProblems(env.ALLOWED_ORIGINS).forEach((p) => errors.push(`ALLOWED_ORIGINS ${p}.`));

  if (env.ENABLE_MOCK_PAYMENTS === 'true') {
    errors.push(
      'ENABLE_MOCK_PAYMENTS must not be "true" in production (mock payments are disabled). Set it to "false" and configure real Stripe keys.'
    );
  } else {
    const sk = String(env.STRIPE_SECRET_KEY || '').trim();
    if (!sk || !sk.startsWith('sk_') || /placeholder|replace|change|example|your[_-]?key/i.test(sk)) {
      errors.push('STRIPE_SECRET_KEY must be a real Stripe secret key (sk_test_… or sk_live_…).');
    }
    const wh = String(env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!wh || !wh.startsWith('whsec_') || /placeholder|replace|change|example/i.test(wh)) {
      errors.push('STRIPE_WEBHOOK_SECRET must be a real Stripe webhook secret (whsec_…).');
    }
  }

  expiryProblems(env.JWT_EXPIRE).forEach((p) => errors.push(`JWT_EXPIRE ${p}.`));

  return errors;
};

const enforceProductionEnv = () => {
  if (process.env.NODE_ENV !== 'production') {
    if (!process.env.JWT_SECRET) {
      console.warn('Warning: JWT_SECRET is not set (required for login; set it in .env for local development).');
    }
    return;
  }
  const errors = validateProductionEnv();
  if (errors.length > 0) {
    console.error('FATAL: invalid production configuration:');
    errors.forEach((e) => console.error(` - ${e}`));
    process.exit(1);
  }
};

module.exports = {
  enforceProductionEnv,
  validateProductionEnv,
  isPlaceholderSecret,
};
