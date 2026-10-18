const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { refuseCrossSiteWrites, refuseCrossSite } = require('../middleware/refuseCrossSite');

// The forms carry no CSRF tokens. What stands in for them is the SameSite=Lax
// session cookie and this: a browser says in Sec-Fetch-Site where a request came
// from, and a write that a page on another site caused is refused.
//
// Two halves: the middleware on its own, with stand-in request and response
// objects, and the real app, where what matters is that a refused request
// starts nothing (no session, no battle).

const SERVER = path.join(__dirname, '..', 'server.js');

function run(middleware, { method = 'POST', url = '/market/buy/1?secret=hunter2', site, json = false } = {}) {
  const headers = site === undefined ? {} : { 'sec-fetch-site': site };
  const outcome = { next: false, status: 200, type: null, body: null };
  const req = {
    method,
    originalUrl: url,
    get: (name) => headers[name.toLowerCase()],
    accepts: () => (json ? 'json' : 'html')
  };
  const res = {
    status(code) { outcome.status = code; return this; },
    type(type) { outcome.type = type; return this; },
    json(body) { outcome.type = 'json'; outcome.body = body; return this; },
    send(body) { outcome.body = body; return this; }
  };
  middleware(req, res, () => { outcome.next = true; });
  return outcome;
}

function quietly(fn) {
  const warn = console.warn;
  const lines = [];
  console.warn = (...args) => lines.push(args.join(' '));
  try {
    fn();
  } finally {
    console.warn = warn;
  }
  return lines;
}

test('a write that another site caused is refused, whatever the method', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const site of ['cross-site', 'same-site', 'Cross-Site', ' cross-site ']) {
      let outcome;
      quietly(() => { outcome = run(refuseCrossSiteWrites, { method, site }); });
      assert.equal(outcome.next, false, `${method} from "${site}" must not go on`);
      assert.equal(outcome.status, 403, `${method} from "${site}"`);
    }
  }
});

test('a write from this site, from a typed address, or from a client that says nothing goes through', () => {
  // The last two are command-line clients, tests and old browsers. None of them
  // is a page borrowing a visitor's cookie, so refusing them would break more
  // than it protects.
  for (const site of ['same-origin', 'none', undefined, '', 'something-new']) {
    const outcome = run(refuseCrossSiteWrites, { site });
    assert.equal(outcome.next, true, `a write with Sec-Fetch-Site ${JSON.stringify(site)} goes on`);
    assert.equal(outcome.status, 200);
  }
});

test('reading is never refused, so a link from another site still works', () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    const outcome = run(refuseCrossSiteWrites, { method, site: 'cross-site' });
    assert.equal(outcome.next, true, method);
  }
});

test('refuseCrossSite is the strict variant, for a GET that changes something', () => {
  let outcome;
  quietly(() => { outcome = run(refuseCrossSite, { method: 'GET', url: '/auth/logout', site: 'cross-site' }); });
  assert.equal(outcome.next, false);
  assert.equal(outcome.status, 403);

  assert.equal(run(refuseCrossSite, { method: 'GET', url: '/auth/logout', site: 'same-origin' }).next, true, 'this site\'s own link works');
  assert.equal(run(refuseCrossSite, { method: 'GET', url: '/auth/logout' }).next, true, 'so does a client that says nothing');
});

test('a refusal is JSON for an API caller and plain text for everyone else', () => {
  let api;
  let page;
  quietly(() => {
    api = run(refuseCrossSiteWrites, { url: '/api/demo/battle', site: 'cross-site', json: true });
    page = run(refuseCrossSiteWrites, { url: '/play/start', site: 'cross-site' });
  });

  assert.equal(api.type, 'json');
  assert.equal(api.body.error, 'cross_site_request');
  assert.equal(page.type, 'text/plain');
  assert.match(page.body, /another site/);
});

test('the log line holds the method, the path and one known word, and not the query string', () => {
  const lines = quietly(() => run(refuseCrossSiteWrites, { url: '/market/buy/1?secret=hunter2', site: 'cross-site' }));

  assert.deepEqual(lines, ['Refused cross-site POST /market/buy/1']);
});

// The real app, in a child process (see the note in boundedSessionStore.test.js).
function probe() {
  const script = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const server = createApp().listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      const form = { 'content-type': 'application/x-www-form-urlencoded' };
      const call = async (route, site, init) => {
        init = init || {};
        const headers = Object.assign({}, init.headers);
        if (site) headers['sec-fetch-site'] = site;
        const res = await fetch(base + route, { method: init.method || 'GET', headers, body: init.body, redirect: 'manual' });
        const body = await res.text();
        return {
          status: res.status,
          type: res.headers.get('content-type') || '',
          cookie: (res.headers.getSetCookie().find((c) => c.startsWith('tt.sid=')) || '').split(';')[0],
          body
        };
      };
      const out = {};

      out.foreignStart = await call('/play/start', 'cross-site', { method: 'POST', headers: form, body: 'teddyId=' });
      out.ownStart = await call('/play/start', 'same-origin', { method: 'POST', headers: form, body: 'teddyId=' });
      out.silentStart = await call('/play/start', undefined, { method: 'POST', headers: form, body: 'teddyId=' });

      // A battle in progress cannot be moved on from another site.
      const cookie = out.ownStart.cookie;
      out.foreignTurn = await call('/play/turn', 'cross-site', { method: 'POST', headers: Object.assign({ cookie }, form), body: 'move=attack' });

      out.foreignApi = await call('/api/demo/battle', 'cross-site', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      out.foreignRead = await call('/play', 'cross-site');
      out.foreignHead = await call('/health', 'cross-site');

      process.stdout.write('<<<' + JSON.stringify(out) + '>>>');
      process.exit(0);
    });
  `;

  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DEMO_MODE: 'true',
      DATABASE_URL: '',
      SESSION_SECRET: 'refuse-cross-site-test'
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60000
  });

  const match = /<<<([\s\S]*?)>>>/.exec(result.stdout || '');
  assert.ok(
    match,
    `probe produced no payload. stderr: ${(result.stderr || '').slice(0, 600)} stdout: ${(result.stdout || '').slice(0, 300)}`
  );
  return JSON.parse(match[1]);
}

const app = probe();

test('in the app, a battle cannot be started from another site, and nothing is started by trying', () => {
  assert.equal(app.foreignStart.status, 403);
  assert.equal(app.foreignStart.cookie, '', 'no session is created for a refused request');
  assert.match(app.foreignStart.body, /another site/);
});

test('in the app, the same request from the site\'s own page, or from a client that says nothing, works', () => {
  assert.equal(app.ownStart.status, 200);
  assert.ok(app.ownStart.cookie, 'control: a session is created when the request is allowed');
  assert.equal(app.silentStart.status, 200);
});

test('in the app, a battle in progress cannot be moved on from another site', () => {
  assert.equal(app.foreignTurn.status, 403);
});

test('in the app, an API write from another site gets a JSON refusal', () => {
  assert.equal(app.foreignApi.status, 403);
  assert.match(app.foreignApi.type, /application\/json/);
  assert.equal(JSON.parse(app.foreignApi.body).error, 'cross_site_request');
});

test('in the app, pages and the health check can still be read from another site', () => {
  assert.equal(app.foreignRead.status, 200);
  assert.equal(app.foreignHead.status, 200);
});
