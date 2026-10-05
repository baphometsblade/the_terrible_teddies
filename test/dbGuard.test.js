const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Database-backed routes must fail fast when there is no connection.
//
// Mongoose buffers an operation against a dead connection for ten seconds and
// then rejects, so every DB route used to hang for ten seconds and answer 500
// with a stack trace. GET /market did exactly that, which is how this was
// found - on a fresh clone, running the demo with no DATABASE_URL.
//
// Two reasons it matters: a ten-second hang per request is a cheap way to tie
// up the server, and a 500 plus stack trace tells the user nothing useful.
//
// The demo routes must stay unguarded - working without a database is their
// entire purpose.

const SERVER = path.join(__dirname, '..', 'server.js');

const DB_ROUTES = [
  ['GET', '/market'],
  ['GET', '/challenges/'],
  ['GET', '/challenges/active'],
  ['GET', '/api/events'],
  ['POST', '/auth/login'],
  ['POST', '/auth/register']
];

const DEMO_ROUTES = [
  ['GET', '/play'],
  ['GET', '/api/demo/teddies'],
  ['GET', '/health']
];

function probe(routes) {
  const script = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const routes = ${JSON.stringify(routes)};
    const server = createApp().listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      const out = {};
      for (const [method, p] of routes) {
        const started = Date.now();
        const res = await fetch(base + p, {
          method,
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: method === 'POST' ? 'probe=1' : undefined,
          redirect: 'manual'
        });
        out[method + ' ' + p] = { status: res.status, ms: Date.now() - started };
      }
      process.stdout.write('<<<' + JSON.stringify(out) + '>>>');
      process.exit(0);
    });
  `;

  const result = spawnSync(process.execPath, ['-e', script], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DEMO_MODE: 'true',
      DATABASE_URL: '',
      SESSION_SECRET: 'db-guard-test'
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 60000
  });

  const match = /<<<([\s\S]*?)>>>/.exec(result.stdout || '');
  assert.ok(match, `probe produced no payload: ${(result.stdout || '').slice(0, 300)}`);
  return JSON.parse(match[1]);
}

test('database-backed routes answer 503, not 500', () => {
  const results = probe(DB_ROUTES);
  const wrong = Object.entries(results)
    .filter(([, r]) => r.status !== 503)
    .map(([route, r]) => `${route} -> ${r.status}`);

  assert.deepEqual(wrong, [], `expected 503 from every DB route without a database: ${wrong.join(', ')}`);
});

test('database-backed routes fail fast, not after a 10s buffer timeout', () => {
  const results = probe(DB_ROUTES);
  // Mongoose buffers for 10,000ms. Anything near that means the guard was
  // bypassed and the request waited on a dead connection.
  const slow = Object.entries(results)
    .filter(([, r]) => r.ms > 2000)
    .map(([route, r]) => `${route} took ${r.ms}ms`);

  assert.deepEqual(slow, [], `route(s) hung instead of failing fast: ${slow.join(', ')}`);
});

test('demo routes still work without a database', () => {
  const results = probe(DEMO_ROUTES);
  const broken = Object.entries(results)
    .filter(([, r]) => r.status !== 200)
    .map(([route, r]) => `${route} -> ${r.status}`);

  assert.deepEqual(broken, [], `the demo must not need a database: ${broken.join(', ')}`);
});
