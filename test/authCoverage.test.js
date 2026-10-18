const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Default-deny: every route must refuse an anonymous caller unless it is
// listed in PUBLIC below, on purpose.
//
// Why this exists: POST /api/teddies/customize used to let any anonymous caller
// rewrite any teddy. It was "fixed" in routes/gameRoutes.js, but a stale
// duplicate router mounted at /api/game still served the same handler, with no
// authentication, at /api/game/api/teddies/customize. Per-route fixes cannot
// catch that - a test that walks every mounted route can.
//
// How: boot the real app, enumerate every route (including nested routers and
// their mount prefixes) and call each one with no session. The database guard
// is neutralised and Mongoose buffering is switched off, so a route that lacks
// auth falls straight through to its handler and fails visibly (500/200)
// instead of being masked by the 503 guard or hanging on a dead connection.
//
// Adding a public route means adding it to PUBLIC here, which makes the
// decision explicit and reviewable.
//
// The same walk checks that every route has a rate limit as its first handler,
// so it runs before authentication or the database. A route that does not is
// the "database access, but is not rate-limited" finding CodeQL raised against
// thirteen handlers before the limits moved onto the routes themselves.

const ROOT = path.join(__dirname, '..');

const PUBLIC = new Set([
  // landing, health, and the database-free playable demo
  'GET /',
  'GET /health',
  'GET /play',
  'POST /play/start',
  'POST /play/turn',
  'GET /api/demo/teddies',
  'POST /api/demo/battle',
  // account entry points
  'GET /auth/register',
  'POST /auth/register',
  'GET /auth/login',
  'POST /auth/login',
  'POST /auth/logout',
  'GET /auth/logout',
  // browse-only listings
  'GET /market',
  'GET /challenges/',
  'GET /challenges/active',
  'GET /api/events'
]);

// Routes that deliberately have no rate limit. Everything else must have one.
const UNLIMITED = new Set([
  // The platform's health check polls this. A limit could get a healthy service
  // restarted.
  'GET /health'
]);

/* eslint-disable no-undef */
// Runs inside the child process. Self-contained on purpose: it is serialised
// with Function#toString, so it cannot reference anything in this file.
async function authProbe(options) {
  const mongoose = require('mongoose');
  // Without this a DB call from an unprotected handler would buffer for 10s.
  mongoose.set('bufferCommands', false);

  // The real guard answers 503 before auth is reached, which would hide the
  // thing being tested.
  const guard = require.resolve('./middleware/requireDatabase');
  require.cache[guard] = {
    id: guard,
    filename: guard,
    loaded: true,
    exports: (req, res, next) => next()
  };

  const { createApp } = require('./server.js');
  const app = createApp();

  if (options.openControl) {
    // A deliberately unprotected route, moved ahead of the 404 handler so it
    // is not shadowed - but after Express's own init layer, which is what
    // gives the response its .json(). Proves the probe can report a failure.
    app.post('/__control__/open', (req, res) => res.json({ ok: true }));
    const stack = app._router.stack;
    const control = stack.pop();
    stack.splice(stack.findIndex((layer) => layer.name === 'expressInit') + 1, 0, control);
  }

  const mountPath = (layer) => {
    if (layer.regexp && layer.regexp.fast_slash) return '';
    const match = /^\^((?:\\\/[^\\/()?]+)+)\\\/\?\(\?=\\\/\|\$\)$/.exec(layer.regexp.source);
    if (!match) throw new Error('cannot derive a mount path from ' + layer.regexp.source);
    return match[1].replace(/\\\//g, '/');
  };

  const routes = [];
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        if (typeof layer.route.path !== 'string') {
          throw new Error('non-string route path under ' + prefix);
        }
        // express-rate-limit puts resetKey on the middleware it returns.
        const first = layer.route.stack[0];
        const limited = Boolean(first && typeof first.handle.resetKey === 'function');
        for (const method of Object.keys(layer.route.methods)) {
          routes.push({ method: method.toUpperCase(), path: prefix + layer.route.path, limited });
        }
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        walk(layer.handle.stack, prefix + mountPath(layer));
      }
    }
  };
  walk(app._router.stack, '');

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;

  const results = [];
  for (const route of routes) {
    const url = base + route.path.replace(/:[A-Za-z]+/g, '000000000000000000000000');
    try {
      const res = await fetch(url, {
        method: route.method,
        headers: { 'content-type': 'application/json' },
        body: route.method === 'GET' ? undefined : '{}',
        redirect: 'manual',
        signal: AbortSignal.timeout(4000)
      });
      results.push({ ...route, status: res.status, location: res.headers.get('location') });
    } catch (error) {
      results.push({ ...route, status: 'no-response', location: null });
    }
  }

  // Delimited: the app logs to stdout, which would otherwise corrupt the payload.
  process.stdout.write('<<<' + JSON.stringify(results) + '>>>');
  process.exit(0);
}
/* eslint-enable no-undef */

function probe({ openControl = false } = {}) {
  const script = '(' + authProbe.toString() + ')(' + JSON.stringify({ openControl }) + ')';

  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DEMO_MODE: 'true',
      DATABASE_URL: '',
      SESSION_SECRET: 'auth-coverage-test'
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000
  });

  const match = /<<<([\s\S]*?)>>>/.exec(result.stdout || '');
  assert.ok(
    match,
    `probe produced no payload. stderr: ${(result.stderr || '').slice(0, 600)} stdout: ${(result.stdout || '').slice(0, 300)}`
  );
  return JSON.parse(match[1]);
}

const key = (r) => `${r.method} ${r.path}`;

const refused = (r) =>
  r.status === 401 ||
  r.status === 403 ||
  ([301, 302, 303, 307, 308].includes(r.status) && /\/auth\/login/.test(r.location || ''));

test('the probe finds the routes it should', () => {
  const routes = probe().map(key);
  // Floor, not an exact count: it only has to prove nested routers and mount
  // prefixes are being resolved.
  assert.ok(routes.length >= 20, `expected to enumerate 20+ routes, found ${routes.length}`);
  assert.ok(routes.includes('POST /auth/login'), 'root-mounted router routes should be found');
  assert.ok(routes.includes('POST /teams/create'), 'prefix-mounted router routes should be found');
  assert.ok(routes.includes('GET /challenges/active'), 'prefix-mounted router routes should be found');
});

test('every route that is not explicitly public refuses an anonymous caller', () => {
  const offenders = probe()
    .filter((r) => !PUBLIC.has(key(r)))
    .filter((r) => !refused(r))
    .map((r) => `${key(r)} -> ${r.status}`);

  assert.deepEqual(
    offenders,
    [],
    `route(s) answered an anonymous request instead of refusing it: ${offenders.join(', ')}. ` +
      'Add the auth middleware, or - if the route is meant to be public - list it in PUBLIC.'
  );
});

test('the PUBLIC allowlist only names routes that exist', () => {
  const existing = new Set(probe().map(key));
  const stale = [...PUBLIC].filter((entry) => !existing.has(entry));

  assert.deepEqual(stale, [], `PUBLIC lists route(s) that no longer exist: ${stale.join(', ')}`);
});

test('the probe can tell an open route from a protected one', () => {
  // Without a control, the checks above could pass because every request
  // fails the same way.
  const results = probe({ openControl: true });
  const control = results.find((r) => key(r) === 'POST /__control__/open');

  assert.ok(control, 'the control route should have been enumerated');
  assert.equal(control.status, 200, 'the control route is open, so it should answer 200');
  assert.equal(refused(control), false, 'an open route must not be classed as refused');

  const protectedRoute = results.find((r) => key(r) === 'POST /game/choose-lineup');
  assert.ok(protectedRoute, 'a known protected route should be enumerated');
  assert.equal(refused(protectedRoute), true, `a protected route must be classed as refused (got ${protectedRoute.status})`);
});

test('every route is rate limited before anything else runs, unless it is listed in UNLIMITED', () => {
  const offenders = probe()
    .filter((r) => !UNLIMITED.has(key(r)))
    .filter((r) => !r.limited)
    .map(key);

  assert.deepEqual(
    offenders,
    [],
    `route(s) with no rate limit as their first handler: ${offenders.join(', ')}. ` +
      'Put actionLimiter from middleware/rateLimits.js first, or - if the route must never be throttled - list it in UNLIMITED.'
  );
});

test('the UNLIMITED allowlist only names routes that exist', () => {
  const existing = new Set(probe().map(key));
  const stale = [...UNLIMITED].filter((entry) => !existing.has(entry));

  assert.deepEqual(stale, [], `UNLIMITED lists route(s) that no longer exist: ${stale.join(', ')}`);
});

test('the probe can tell a limited route from an unlimited one', () => {
  // Without a control, "every route is limited" could pass because the probe
  // reports everything as limited.
  const results = probe({ openControl: true });
  const control = results.find((r) => key(r) === 'POST /__control__/open');
  assert.ok(control, 'the control route should have been enumerated');
  assert.equal(control.limited, false, 'a route with no limiter must be reported as unlimited');

  for (const name of ['POST /play/start', 'POST /auth/login', 'POST /game/choose-lineup', 'GET /market']) {
    const route = results.find((r) => key(r) === name);
    assert.ok(route, `${name} should have been enumerated`);
    assert.equal(route.limited, true, `${name} should be reported as limited`);
  }
});
