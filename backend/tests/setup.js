// Jest setup: deterministic, hermetic environment for the API suite.
// Uses the project's own development thresholds (rate limiters) so repeated
// runs stay deterministic. Production behavior is unchanged.
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'campushub-test-secret-0123456789abcdef';
process.env.JWT_EXPIRE = '1h';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'campushub-test-session-0123456789abcdef';

jest.setTimeout(60000);
