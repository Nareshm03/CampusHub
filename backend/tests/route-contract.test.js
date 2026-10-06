// ROUTE / CONTRACT AUDIT — every active frontend API call must resolve to a
// mounted backend route+method; no duplicated /api prefix; known-dead
// architectures must stay unwired. Backend-only routes are reported, not failed.
const fs = require('fs');
const path = require('path');
const { buildTestApp } = require('./helpers/app');

const FRONTEND_ROOT = path.join(__dirname, '..', '..', 'frontend');
const API_DIRS = ['app', 'components', 'lib', 'context', 'hooks'];
const API_BASE = '/api/v1';

// Routers mounted in production but intentionally not consumed by any UI.
const KNOWN_DEAD_PREFIXES = ['/api/v1/exam-schedules'];

// Dead frontend callers, classified 2026-10-05. UNUSED files have zero
// imports anywhere; ACTIVE-UNAVAILABLE endpoints have no backend route and
// their UI must surface the failure (see GlobalSearch error state).
// The test asserts this exact set: new dead calls fail, and fixing one fails
// until its pin is removed here.
const KNOWN_DEAD_CALLS = [
  // components/SystemSettings.jsx — UNUSED (admin settings page has its own UI)
  'GET|components/SystemSettings.jsx|/config/configs',
  'GET|components/SystemSettings.jsx|/config/semester-locks',
  'PUT|components/SystemSettings.jsx|/config/configs/:param',
  'POST|components/SystemSettings.jsx|/config/semester-locks',
  'DELETE|components/SystemSettings.jsx|/config/semester-locks/:param',
  // hooks/useNotifications.js — UNUSED (no imports; REST equivalent is /notifications/my)
  'GET|hooks/useNotifications.js|/notifications/:param/unread-count',
  'GET|hooks/useNotifications.js|/notifications/:param',
  // components/ui/GlobalSearch.jsx — ACTIVE but no backend /search route;
  // UI shows an explicit unavailable state instead of silent empty results.
  'GET|components/ui/GlobalSearch.jsx|/search',
];

function walkRouter(stack, base, out) {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods || {}).filter((m) => layer.route.methods[m] && m !== '_all');
      const full = (base + layer.route.path).replace(/\/+/g, '/');
      for (const method of methods) out.push({ method: method.toUpperCase(), path: full });
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      walkRouter(layer.handle.stack, base + mountPrefix(layer.regexp), out);
    }
  }
}

function mountPrefix(regexp) {
  const src = regexp.source;
  let out = '';
  for (let i = 1; i < src.length; i++) {
    if (src[i] === '\\' && i + 1 < src.length) {
      out += src[i + 1] === '/' ? '/' : src[i + 1];
      i++;
    } else if (src[i] === '(' || src[i] === '?' || src[i] === '$') break;
    else out += src[i];
  }
  return out.replace(/\/$/, '');
}

function listFrontendFiles() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  for (const d of API_DIRS) {
    const full = path.join(FRONTEND_ROOT, d);
    if (fs.existsSync(full)) walk(full);
  }
  return files;
}

function replaceTemplates(literal, replacement = ':param') {
  // Brace-balanced ${...} replacement (handles nested ternaries/backticks).
  let out = '';
  let i = 0;
  while (i < literal.length) {
    if (literal[i] === '$' && literal[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < literal.length && depth > 0) {
        if (literal[i] === '{') depth++;
        else if (literal[i] === '}') depth--;
        i++;
      }
      out += replacement;
    } else {
      out += literal[i];
      i++;
    }
  }
  return out;
}

function extractCalls() {
  const calls = [];
  const callRe = /\.(get|post|put|patch|delete|request)\(\s*[`'"](\/)/g;
  for (const file of listFrontendFiles()) {
    const src = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = callRe.exec(src)) !== null) {
      const method = match[1];
      const quote = src[match.index + match[0].length - 2];
      // Read until the matching close quote; ${...} nests (with its own
      // backticks) and does not terminate the literal.
      let i = match.index + match[0].length;
      let literal = '/';
      let depth = 0;
      while (i < src.length) {
        const ch = src[i];
        if (quote === '`' && ch === '$' && src[i + 1] === '{') depth++;
        else if (quote === '`' && ch === '}' && depth > 0) depth--;
        else if (ch === quote && depth === 0) break;
        literal += ch;
        i++;
      }
      const line = src.slice(0, match.index).split('\n').length;
      const raw = literal;
      // A template may evaluate to a path segment or to nothing (query-only
      // suffixes like `${cond ? '?x=1' : ''}`); accept either resolution.
      const variants = Array.from(new Set([
        replaceTemplates(literal, ':param').split('?')[0],
        replaceTemplates(literal, '').split('?')[0],
      ])).filter((v) => v && v !== '/');
      calls.push({ method: method.toUpperCase(), paths: variants, file: path.relative(FRONTEND_ROOT, file), line, raw });
    }
  }
  return calls;
}

function matches(backend, method, frontendPath) {
  const bSeg = backend.path.split('/').filter(Boolean);
  const fSeg = (API_BASE + frontendPath).split('/').filter(Boolean);
  if (bSeg.length !== fSeg.length || backend.method !== method) return false;
  return bSeg.every((s, i) => s.startsWith(':') || s === fSeg[i]);
}

describe('route contract audit', () => {
  const app = buildTestApp();
  const backendRoutes = [];
  walkRouter(app._router.stack, '', backendRoutes);
  const frontendCalls = extractCalls();

  test('backend exposes a sane route surface', () => {
    expect(backendRoutes.length).toBeGreaterThan(100);
  });

  test('frontend covers real product areas', () => {
    expect(frontendCalls.length).toBeGreaterThan(50);
  });

  test('no duplicated /api prefix in frontend calls', () => {
    const dupes = frontendCalls.filter((c) => c.raw.startsWith('/api/') || c.raw.includes('/api/v1/api'));
    expect(dupes).toEqual([]);
  });

  test('every frontend call resolves to a mounted route+method', () => {
    const dead = frontendCalls.filter((c) => !c.paths.some((p) => backendRoutes.some((b) => matches(b, c.method, p))));
    const deadKeys = dead.map((c) => {
      const file = c.file.split(path.sep).join('/');
      const pinnedPath = c.paths.find((p) => KNOWN_DEAD_CALLS.includes(`${c.method}|${file}|${p}`));
      return pinnedPath ? `${c.method}|${file}|${pinnedPath}` : `UNPINNED ${c.method} ${c.raw} (${c.file}:${c.line})`;
    });
    // Unknown dead calls fail loudly; fixing a pinned call fails until the pin is removed.
    expect(deadKeys.filter((k) => k.startsWith('UNPINNED'))).toEqual([]);
    expect(deadKeys.filter((k) => !k.startsWith('UNPINNED')).sort()).toEqual([...KNOWN_DEAD_CALLS].sort());
  });

  test('known-dead architectures stay unwired by the UI', () => {
    const wired = frontendCalls.filter((c) =>
      c.paths.some((p) => KNOWN_DEAD_PREFIXES.some((prefix) => (API_BASE + p).startsWith(prefix)))
    );
    expect(wired.map((c) => `${c.method} ${c.raw} (${c.file}:${c.line})`)).toEqual([]);
  });

  test('backend-only inventory is reported (informational)', () => {
    const used = new Set();
    for (const c of frontendCalls) {
      for (const p of c.paths) {
        for (const b of backendRoutes) {
          if (matches(b, c.method, p)) used.add(`${b.method} ${b.path}`);
        }
      }
    }
    const unused = backendRoutes.filter((b) => !used.has(`${b.method} ${b.path}`));
    // Informational only — backend-only routes are legitimate.
    // eslint-disable-next-line no-console
    console.log(`backend-only routes: ${unused.length}/${backendRoutes.length}`);
    expect(true).toBe(true);
  });
});
