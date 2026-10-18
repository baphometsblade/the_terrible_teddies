const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const express = require('express');
const expressSession = require('express-session');
const BoundedSessionStore = require('../utils/boundedSessionStore');

const { parseMaxSessions, DEFAULT_MAX_SESSIONS } = BoundedSessionStore;

// The demo keeps its sessions in memory, and express-session's MemoryStore never
// evicts them: an expired session is dropped only if its cookie is presented
// again, and a visitor who has gone never presents it. Measured on this app,
// each cookie-less POST /play/start left about a kilobyte behind, in a straight
// line with no ceiling - anyone who could send requests could fill the memory
// of a server whose only store this is.
//
// The store under test is capped and sweeps what has expired.

const SERVER = path.join(__dirname, '..', 'server.js');

// A clock the tests move by hand, and a store that uses it. The sweep interval
// is long so it never fires on its own unless a test asks it to.
function clock(start = 1000000) {
  const state = { t: start };
  const now = () => state.t;
  now.advance = (ms) => { state.t += ms; };
  return now;
}

// Every store made here is closed at the end, pass or fail. An interval left
// running would keep this process alive, so a failing test would hang the whole
// run instead of reporting.
const created = [];
after(() => {
  for (const store of created) store.close();
});

function makeStore(options = {}) {
  const now = options.now || clock();
  const store = new BoundedSessionStore({ sweepIntervalMs: 3600000, ...options, now });
  store.testClock = now;
  created.push(store);
  return store;
}

// A session as express-session hands it over: a cookie that expires, plus data.
function sessionFor(store, data = {}, lifetimeMs = 60000) {
  const expires = new Date(store.testClock() + lifetimeMs);
  return { cookie: { originalMaxAge: lifetimeMs, expires, httpOnly: true, path: '/' }, ...data };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function asPromises(store) {
  const settle = (resolve, reject) => (error, value) => (error ? reject(error) : resolve(value));
  return {
    get: (sid) => new Promise((resolve, reject) => store.get(sid, settle(resolve, reject))),
    set: (sid, sess) => new Promise((resolve, reject) => store.set(sid, sess, settle(resolve, reject))),
    touch: (sid, sess) => new Promise((resolve, reject) => store.touch(sid, sess, settle(resolve, reject))),
    destroy: (sid) => new Promise((resolve, reject) => store.destroy(sid, settle(resolve, reject))),
    length: () => new Promise((resolve, reject) => store.length(settle(resolve, reject))),
    all: () => new Promise((resolve, reject) => store.all(settle(resolve, reject)))
  };
}

test('rejects a cap that is not a positive whole number', () => {
  for (const bad of [0, -1, 1.5, '10', NaN, null]) {
    assert.throws(() => new BoundedSessionStore({ maxSessions: bad }), RangeError, `maxSessions: ${String(bad)}`);
  }
  const ok = makeStore({ maxSessions: undefined });
  assert.equal(ok.maxSessions, DEFAULT_MAX_SESSIONS);
});

test('parseMaxSessions takes a whole number of at least one, else the default', () => {
  assert.equal(parseMaxSessions('250'), 250);
  assert.equal(parseMaxSessions('  42 '), 42);
  assert.equal(parseMaxSessions('1.9'), 1);
  for (const bad of ['abc', '0', '-3', '', undefined, null, '0.5']) {
    assert.equal(parseMaxSessions(bad), DEFAULT_MAX_SESSIONS, `input: ${String(bad)}`);
  }
  assert.equal(parseMaxSessions('abc', 7), 7, 'the fallback can be chosen');
});

test('what goes in comes back out, as a copy', async () => {
  const store = makeStore();
  const s = asPromises(store);
  const original = sessionFor(store, { demoBattle: { hp: 10, log: ['hit'] } });

  await s.set('a', original);
  original.demoBattle.hp = 0; // changing the caller's object afterwards...
  const first = await s.get('a');
  assert.equal(first.demoBattle.hp, 10, '...must not change what is stored');

  first.demoBattle.log.push('tampered'); // changing what get returned...
  const second = await s.get('a');
  assert.deepEqual(second.demoBattle.log, ['hit'], '...must not change what is stored either');
  store.close();
});

test('an unknown session comes back empty', async () => {
  const store = makeStore();
  assert.equal(await asPromises(store).get('nope'), null);
  store.close();
});

test('destroy removes a session', async () => {
  const store = makeStore();
  const s = asPromises(store);
  await s.set('a', sessionFor(store, { n: 1 }));
  await s.destroy('a');
  assert.equal(await s.get('a'), null);
  assert.equal(await s.length(), 0);
  store.close();
});

test('a session past its expiry is gone, and read as such', async () => {
  const store = makeStore();
  const s = asPromises(store);
  await s.set('a', sessionFor(store, { n: 1 }, 1000));

  store.testClock.advance(999);
  assert.equal((await s.get('a')).n, 1, 'still alive just before the end');

  store.testClock.advance(2);
  assert.equal(await s.get('a'), null, 'expired');
  assert.equal(store.entries.size, 0, 'and removed, not just hidden');
  store.close();
});

test('a cookie with no expiry still ends: after a day', async () => {
  const store = makeStore();
  const s = asPromises(store);
  await s.set('a', { cookie: { originalMaxAge: null, expires: null }, n: 1 });

  store.testClock.advance(23 * 3600000);
  assert.equal((await s.get('a')).n, 1);
  store.testClock.advance(2 * 3600000);
  assert.equal(await s.get('a'), null);
  store.close();
});

test('past the cap the least recently used session is dropped', async () => {
  const store = makeStore({ maxSessions: 3 });
  const s = asPromises(store);
  for (const sid of ['a', 'b', 'c', 'd']) await s.set(sid, sessionFor(store, { sid }));

  assert.equal(store.entries.size, 3);
  assert.equal(await s.get('a'), null, 'the oldest went');
  for (const sid of ['b', 'c', 'd']) assert.equal((await s.get(sid)).sid, sid);
  store.close();
});

test('reading a session makes it recent, so it outlives older ones', async () => {
  const store = makeStore({ maxSessions: 3 });
  const s = asPromises(store);
  for (const sid of ['a', 'b', 'c']) await s.set(sid, sessionFor(store, { sid }));

  await s.get('a'); // a is now the most recent; b is the oldest
  await s.set('d', sessionFor(store, { sid: 'd' }));

  assert.equal(await s.get('b'), null, 'b was the least recently used');
  assert.equal((await s.get('a')).sid, 'a');
  store.close();
});

test('writing an existing session again does not grow the store', async () => {
  const store = makeStore({ maxSessions: 2 });
  const s = asPromises(store);
  await s.set('a', sessionFor(store, { v: 1 }));
  await s.set('b', sessionFor(store, { v: 1 }));
  for (let i = 2; i < 50; i++) await s.set('a', sessionFor(store, { v: i }));

  assert.equal(store.entries.size, 2);
  assert.equal((await s.get('b')).v, 1, 'rewriting a never pushed b out');
  assert.equal((await s.get('a')).v, 49);
  store.close();
});

test('sweep removes what has expired without anyone reading it', async () => {
  const store = makeStore();
  const s = asPromises(store);
  await s.set('short1', sessionFor(store, {}, 1000));
  await s.set('short2', sessionFor(store, {}, 2000));
  await s.set('long', sessionFor(store, { keep: true }, 60000));

  store.testClock.advance(5000);
  assert.equal(store.entries.size, 3, 'nothing has read them, so nothing has noticed');
  assert.equal(store.sweep(), 2);
  assert.deepEqual([...store.entries.keys()], ['long']);
  assert.equal((await s.get('long')).keep, true);
  store.close();
});

test('the timer sweeps on its own', async () => {
  const store = makeStore({ sweepIntervalMs: 10 });
  const s = asPromises(store);
  await s.set('a', sessionFor(store, {}, 1000));
  store.testClock.advance(5000);

  const deadline = Date.now() + 3000;
  while (store.entries.size > 0 && Date.now() < deadline) await wait(10);

  assert.equal(store.entries.size, 0, 'the interval should have removed it');
  store.close();
});

test('the timer does not keep the process alive', () => {
  const store = makeStore();
  assert.equal(store.sweeper.hasRef(), false);
  store.close();

  // And for real: a process that makes a store and then has nothing to do exits.
  const script = `
    const Store = require(${JSON.stringify(path.join(__dirname, '..', 'utils', 'boundedSessionStore'))});
    new Store({ sweepIntervalMs: 50 });
  `;
  const result = spawnSync(process.execPath, ['-e', script], { timeout: 15000, encoding: 'utf8' });
  assert.equal(result.error, undefined, 'it exited by itself rather than hanging');
  assert.equal(result.status, 0);
});

test('touch refreshes the cookie, keeps the data, and counts as use', async () => {
  const store = makeStore({ maxSessions: 2 });
  const s = asPromises(store);
  await s.set('a', sessionFor(store, { keep: 'me' }, 1000));
  await s.set('b', sessionFor(store, {}, 60000));

  store.testClock.advance(900);
  await s.touch('a', sessionFor(store, { ignored: true }, 1000)); // a fresh cookie, new data ignored
  store.testClock.advance(500); // past a's original end, inside the refreshed one

  const a = await s.get('a');
  assert.equal(a.keep, 'me', 'the stored data is untouched');
  assert.equal(a.ignored, undefined);

  await s.set('c', sessionFor(store, {}, 60000)); // over the cap: b is now the least recent
  assert.equal(await s.get('b'), null);

  await s.touch('missing', sessionFor(store)); // touching nothing is harmless
  assert.equal(await s.length(), 2);
  store.close();
});

test('length and all describe the live sessions only', async () => {
  const store = makeStore();
  const s = asPromises(store);
  await s.set('a', sessionFor(store, { n: 1 }, 1000));
  await s.set('b', sessionFor(store, { n: 2 }, 60000));
  store.testClock.advance(5000);

  assert.equal(await s.length(), 1);
  assert.deepEqual(Object.keys(await s.all()), ['b']);
  store.close();
});

test('a session that cannot be serialised is an error, not a crash', async () => {
  const store = makeStore();
  const circular = sessionFor(store);
  circular.self = circular;
  await assert.rejects(asPromises(store).set('a', circular), TypeError);
  assert.equal(store.entries.size, 0);
  store.close();
});

test('works as an express-session store: cookies, regenerate, destroy, and the cap', async () => {
  const store = new BoundedSessionStore({ maxSessions: 2 });
  const app = express();
  // As in production: behind a proxy that terminates TLS, with a secure cookie.
  app.set('trust proxy', 1);
  app.use(expressSession({
    name: 'sid',
    secret: 'bounded-store-test',
    resave: false,
    saveUninitialized: false,
    store,
    cookie: { maxAge: 60000, secure: true }
  }));
  app.get('/set', (req, res) => { req.session.value = req.query.v; res.send('ok'); });
  app.get('/get', (req, res) => res.json({ value: req.session.value || null }));
  app.get('/regenerate', (req, res) => req.session.regenerate(() => { req.session.value = 'after'; res.send('ok'); }));
  app.get('/destroy', (req, res) => req.session.destroy(() => res.send('bye')));

  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const cookieOf = (res) => (res.headers.getSetCookie().find((c) => c.startsWith('sid=')) || '').split(';')[0];
  const tls = { 'x-forwarded-proto': 'https' };
  const read = async (cookie) => (await (await fetch(`${base}/get`, { headers: { cookie, ...tls } })).json()).value;

  try {
    const a = cookieOf(await fetch(`${base}/set?v=a`, { headers: tls }));
    assert.ok(a, 'a cookie is issued');
    assert.equal(await read(a), 'a', 'and it brings the session back');

    const b = cookieOf(await fetch(`${base}/set?v=b`, { headers: tls }));
    const c = cookieOf(await fetch(`${base}/set?v=c`, { headers: tls }));
    assert.equal(await read(a), null, 'the cap of two pushed the first one out');
    assert.equal(await read(b), 'b');
    assert.equal(await read(c), 'c');

    const regenerated = cookieOf(await fetch(`${base}/regenerate`, { headers: { cookie: c, ...tls } }));
    assert.ok(regenerated && regenerated !== c, 'regenerate issues a new id');
    assert.equal(await read(c), null, 'the old id is dead');
    assert.equal(await read(regenerated), 'after');

    await fetch(`${base}/destroy`, { headers: { cookie: regenerated, ...tls } });
    assert.equal(await read(regenerated), null, 'destroy ends it');
  } finally {
    server.close();
    if (server.closeAllConnections) server.closeAllConnections();
    store.close();
  }
});

// The demo through the whole app. DEMO_MAX_SESSIONS is set small so the cap is
// reachable in a few dozen requests.
function probeCap() {
  const script = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const server = createApp().listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      const form = { 'content-type': 'application/x-www-form-urlencoded' };
      const start = async () => {
        const res = await fetch(base + '/play/start', { method: 'POST', headers: form, body: 'teddyId=' });
        await res.arrayBuffer();
        return (res.headers.getSetCookie().find((c) => c.startsWith('tt.sid=')) || '').split(';')[0];
      };
      const turn = async (cookie) => {
        const res = await fetch(base + '/play/turn', { method: 'POST', headers: Object.assign({ cookie }, form), body: 'move=attack', redirect: 'manual' });
        await res.arrayBuffer();
        return res.status;
      };
      const first = await start();
      const before = await turn(first);
      let last;
      for (let i = 0; i < 60; i++) last = await start();
      const out = { before, firstAfter: await turn(first), lastAfter: await turn(last) };
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
      SESSION_SECRET: 'bounded-store-test',
      DEMO_MAX_SESSIONS: '20'
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60000
  });

  const match = /<<<([\s\S]*?)>>>/.exec(result.stdout || '');
  assert.ok(match, `probe produced no payload.\nstdout: ${(result.stdout || '').slice(0, 300)}\nstderr: ${(result.stderr || '').slice(0, 300)}`);
  return { ...JSON.parse(match[1]), log: (result.stdout || '') + (result.stderr || '') };
}

test('the demo drops old battles once the cap is reached, and keeps recent ones', () => {
  const out = probeCap();

  assert.equal(out.before, 200, 'control: a fresh battle can take a turn');
  assert.equal(out.firstAfter, 302, 'sixty newer visitors later, the first battle is gone and the player is sent back to pick a fighter');
  assert.equal(out.lastAfter, 200, 'the most recent battle is still there');
  assert.match(out.log, /capped at 20 sessions/, 'the cap in force is logged at startup');
});
