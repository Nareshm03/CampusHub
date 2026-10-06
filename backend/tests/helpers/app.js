// Test Express app: mounts the REAL production route index at /api/v1 with
// the REAL response formatter and error handler — the same contract the
// deployed server exposes (minus deployment middleware: sessions, HTTPS,
// redis-backed throttles, cron, sockets). No network listener is opened;
// supertest drives the app in-process.
const express = require('express');
const session = require('express-session');
const responseFormatter = require('../../src/middleware/responseFormatter');
const errorHandler = require('../../src/middleware/errorHandler');
const routes = require('../../src/routes');

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  // Mirrors production's session middleware (prod uses a Mongo store; the
  // in-memory store here is test-only). Required by /auth/logout.
  app.use(session({
    secret: process.env.SESSION_SECRET || 'campushub-test-session',
    resave: false,
    saveUninitialized: false,
  }));
  app.use(responseFormatter);
  app.use('/api/v1', routes);
  app.use(errorHandler);
  return app;
}

module.exports = { buildTestApp };
