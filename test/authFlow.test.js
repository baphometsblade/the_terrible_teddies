const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

const User = require('../models/User');
const Player = require('../models/Player');

// Register, log in and log out, run through the real router and a real session
// middleware, with the database replaced by in-memory stand-ins.
//
// These paths could not be tested before because they need MongoDB. So nothing
// would have noticed if login stopped working, if the session id stopped
// changing on login (session fixation), or if an unknown username stopped
// costing as much time as a wrong password (which tells an attacker which
// usernames exist). authCoverage only checks what an anonymous caller is
// refused; this checks what a person who gets in is given.
//
// The models are only stubbed here. Requiring them compiles their schemas and
// never opens a connection.

const ROOT = path.join(__dirname, '..');

let users;
let ids;
let calls;
let failPlayerCreate;
let logged;

function reset() {
  users = new Map();
  ids = 0;
  calls = { findOne: [], create: [], playerCreate: [], deleteOne: [], compare: [] };
  failPlayerCreate = false;
  logged = [];
}
reset();

User.findOne = async (filter) => {
  calls.findOne.push(filter);
  return users.get(filter.username) || null;
};

User.create = async (doc) => {
  calls.create.push(doc);
  if (users.has(doc.username)) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
  const user = { _id: `user-${++ids}`, username: doc.username, password: await bcrypt.hash(doc.password, 4) };
  users.set(user.username, user);
  return user;
};

User.deleteOne = async (filter) => {
  calls.deleteOne.push(filter);
  for (const [name, user] of users) if (user._id === filter._id) users.delete(name);
  return { deletedCount: 1 };
};

Player.create = async (doc) => {
  calls.playerCreate.push(doc);
  if (failPlayerCreate) throw new Error('player store down');
  return doc;
};

async function addUser(username, password) {
  users.set(username, { _id: `user-${++ids}`, username, password: await bcrypt.hash(password, 4) });
}

const realCompare = bcrypt.compare;
const realConsole = { log: console.log, error: console.error, warn: console.warn };
let server;
let base;

function buildApp() {
  const app = express();
  // One connection per request. A server keeps an idle connection open for five
  // seconds, which would hold the process open that long after the last test.
  app.use((req, res, next) => { res.set('Connection', 'close'); next(); });
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(session({
    name: 'tt.sid',
    secret: 'auth-flow-test',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' }
  }));

  // Stand-ins for the rest of the site: one gives a visitor a session without
  // logging in, as playing the demo does; the other shows what a session holds.
  app.get('/__seed', (req, res) => { req.session.seeded = true; res.send('seeded'); });
  app.get('/__whoami', (req, res) => res.json({
    userId: req.session.userId ? String(req.session.userId) : null,
    user: req.session.user || null,
    seeded: Boolean(req.session.seeded)
  }));

  app.use(require('../routes/authRoutes'));
  return app;
}

before(async () => {
  // Count every password comparison, then do it for real.
  bcrypt.compare = (...args) => {
    calls.compare.push(args[1]);
    return realCompare.apply(bcrypt, args);
  };

  const capture = (...args) => { logged.push(args.map(String).join(' ')); };
  console.log = capture;
  console.error = capture;
  console.warn = capture;

  server = await new Promise((resolve) => { const s = buildApp().listen(0, () => resolve(s)); });
  // This listener must not be what keeps the process alive. On Node 18 a
  // root-level after() runs only once the event loop is empty, so a server that
  // is closed only there waits for itself forever: every test passes and the
  // process never exits. after() below still closes it where hooks run sooner.
  server.unref();
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  bcrypt.compare = realCompare;
  Object.assign(console, realConsole);
  server.close();
  if (server.closeAllConnections) server.closeAllConnections();
});

const FORM = { 'content-type': 'application/x-www-form-urlencoded' };
const JSON_TYPE = { 'content-type': 'application/json' };

async function send(method, route, { body, headers = {}, cookie } = {}) {
  const res = await fetch(base + route, {
    method,
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
    body,
    redirect: 'manual'
  });
  const text = await res.text();
  const setCookies = res.headers.getSetCookie();
  return {
    status: res.status,
    text,
    location: res.headers.get('location'),
    setCookies,
    // name=value, ready to send back as a Cookie header
    sid: (setCookies.find((c) => c.startsWith('tt.sid=')) || '').split(';')[0]
  };
}

const postForm = (route, fields, cookie) => send('POST', route, { body: new URLSearchParams(fields).toString(), headers: FORM, cookie });
const postJson = (route, value, cookie) => send('POST', route, { body: JSON.stringify(value), headers: JSON_TYPE, cookie });
const whoami = async (cookie) => JSON.parse((await send('GET', '/__whoami', { cookie })).text);

const GOOD_PASSWORD = 'correct horse battery';

test('registering refuses missing, short, long and non-string input without creating anything', async () => {
  reset();
  const attempts = [
    ['nothing at all', () => postForm('/auth/register', {})],
    ['a blank username', () => postForm('/auth/register', { username: '   ', password: GOOD_PASSWORD })],
    ['a password under 10 characters', () => postForm('/auth/register', { username: 'alice', password: 'short' })],
    ['a username over 40 characters', () => postForm('/auth/register', { username: 'a'.repeat(41), password: GOOD_PASSWORD })],
    ['a username that is an operator object', () => postJson('/auth/register', { username: { $ne: '' }, password: GOOD_PASSWORD })],
    ['a password that is an array', () => postJson('/auth/register', { username: 'alice', password: [GOOD_PASSWORD] })]
  ];

  for (const [label, attempt] of attempts) {
    assert.equal((await attempt()).status, 400, label);
  }
  assert.match((await postForm('/auth/register', { username: 'alice', password: 'short' })).text, /at least 10 characters/);
  assert.deepEqual(calls.create, [], 'no account was created');
  assert.deepEqual(calls.playerCreate, [], 'and no game profile');
});

test('registering refuses control characters in a username, so a name cannot forge log lines', async () => {
  reset();
  for (const character of ['\n', '\r', '\t', '\u0000', '\u001b', '\u007f']) {
    const username = `alice${character}[ERROR] forged`;
    const res = await postJson('/auth/register', { username, password: GOOD_PASSWORD });
    assert.equal(res.status, 400, `U+${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
  }
  assert.deepEqual(calls.create, []);
});

test('registering creates the account and its game profile, then sends the person to log in', async () => {
  reset();
  const res = await postForm('/auth/register', { username: '  alice  ', password: GOOD_PASSWORD });

  assert.equal(res.status, 302);
  assert.equal(res.location, '/auth/login');
  assert.deepEqual(calls.create, [{ username: 'alice', password: GOOD_PASSWORD }], 'the username is trimmed');
  assert.deepEqual(calls.playerCreate, [{ user: 'user-1', username: 'alice' }], 'the profile points at the account');
});

test('a profile that cannot be created takes the account it just made with it', async () => {
  reset();
  failPlayerCreate = true;
  const res = await postForm('/auth/register', { username: 'alice', password: GOOD_PASSWORD });

  assert.equal(res.status, 500);
  assert.deepEqual(calls.deleteOne, [{ _id: 'user-1' }]);
  assert.equal(users.size, 0, 'no account is left without a profile');
});

test('a username that is taken is a 409', async () => {
  reset();
  await addUser('alice', GOOD_PASSWORD);
  const res = await postForm('/auth/register', { username: 'alice', password: GOOD_PASSWORD });
  assert.equal(res.status, 409);
  assert.deepEqual(calls.playerCreate, []);
});

test('a wrong password and an unknown user get the same answer, and no session', async () => {
  reset();
  await addUser('alice', GOOD_PASSWORD);

  const wrongPassword = await postForm('/auth/login', { username: 'alice', password: 'not the password' });
  const unknownUser = await postForm('/auth/login', { username: 'nobody', password: 'not the password' });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.text, 'Invalid username or password.');
  assert.equal(unknownUser.text, wrongPassword.text, 'the message must not say which half was wrong');
  assert.equal(wrongPassword.sid, '', 'a failed login must not start a session');
  assert.equal(unknownUser.sid, '');
});

test('an unknown user still costs a password comparison, so timing does not reveal which usernames exist', async () => {
  reset();
  await postForm('/auth/login', { username: 'nobody', password: 'whatever it was' });

  assert.equal(calls.compare.length, 1, 'one comparison, as for a real user');
  assert.match(calls.compare[0], /^\$2[aby]\$\d\d\$/, 'against something shaped like a bcrypt hash');
});

test('the stand-in hash for an unknown user costs the same as a real one', () => {
  // bcrypt takes time proportional to 2^cost. If the real cost were raised and
  // the stand-in were not, a missing user would answer faster than a wrong
  // password again.
  const routes = fs.readFileSync(path.join(ROOT, 'routes', 'authRoutes.js'), 'utf8');
  const model = fs.readFileSync(path.join(ROOT, 'models', 'User.js'), 'utf8');

  const standIn = /bcrypt\.compare\(password, '\$2[aby]\$(\d\d)\$[^']*'\)/.exec(routes);
  const real = /bcrypt\.hash\(user\.password, (\d+)/.exec(model);

  assert.ok(standIn, 'could not find the stand-in hash in routes/authRoutes.js; has it moved?');
  assert.ok(real, 'could not find the hashing cost in models/User.js; has it moved?');
  assert.equal(Number(standIn[1]), Number(real[1]));
});

test('login never lets an object reach the query', async () => {
  reset();
  const attempts = [
    () => postJson('/auth/login', { username: { $ne: '' }, password: 'x' }),
    () => postJson('/auth/login', { username: 'alice', password: { $gt: '' } }),
    () => postForm('/auth/login', { 'username[$ne]': '', password: 'x' })
  ];
  for (const attempt of attempts) assert.equal((await attempt()).status, 400);
  assert.deepEqual(calls.findOne, [], 'nothing was looked up');

  await postForm('/auth/login', { username: 'alice', password: 'x' });
  assert.equal(calls.findOne.length, 1);
  assert.equal(typeof calls.findOne[0].username, 'string', 'control: a real attempt does look the user up, by a string');
});

test('a correct login starts a session for that user and sends them home', async () => {
  reset();
  await addUser('alice', GOOD_PASSWORD);
  const res = await postForm('/auth/login', { username: ' alice ', password: GOOD_PASSWORD });

  assert.equal(res.status, 302);
  assert.equal(res.location, '/');
  assert.ok(res.sid, 'a session cookie is issued');
  assert.deepEqual(await whoami(res.sid), {
    userId: 'user-1',
    user: { id: 'user-1', username: 'alice' },
    seeded: false
  });
});

test('logging in replaces the session id and drops what the old session held', async () => {
  reset();
  await addUser('alice', GOOD_PASSWORD);

  // Somebody who already has a session, as a visitor who has played the demo does.
  const visitor = (await send('GET', '/__seed')).sid;
  assert.ok(visitor);
  assert.equal((await whoami(visitor)).seeded, true, 'control: the session from before login works');

  const res = await postForm('/auth/login', { username: 'alice', password: GOOD_PASSWORD }, visitor);

  assert.ok(res.sid && res.sid !== visitor, 'a new session id is issued at login');
  assert.deepEqual(await whoami(visitor), { userId: null, user: null, seeded: false }, 'so an id planted beforehand is worthless');
  const now = await whoami(res.sid);
  assert.equal(now.userId, 'user-1');
  assert.equal(now.seeded, false, 'nothing is carried over from the old session');
});

for (const method of ['POST', 'GET']) {
  test(`${method} /auth/logout ends the session and clears the cookie`, async () => {
    reset();
    await addUser('alice', GOOD_PASSWORD);
    const { sid } = await postForm('/auth/login', { username: 'alice', password: GOOD_PASSWORD });
    assert.equal((await whoami(sid)).userId, 'user-1', 'control: logged in before logging out');

    const res = await send(method, '/auth/logout', { cookie: sid });

    assert.equal(res.status, 302);
    assert.equal(res.location, '/auth/login');
    const cleared = res.setCookies.find((c) => c.startsWith('tt.sid='));
    assert.ok(cleared && /^tt\.sid=;/.test(cleared) && /1970/.test(cleared), `expected the cookie to be expired, got: ${cleared}`);
    assert.equal((await whoami(sid)).userId, null, 'and the session is gone on the server too');
  });
}

test('passwords never reach the log', async () => {
  reset();
  const password = 'correct horse battery staple';
  await postForm('/auth/register', { username: 'alice', password });
  await postForm('/auth/login', { username: 'alice', password });
  await postForm('/auth/login', { username: 'alice', password: `${password}!` });

  assert.ok(logged.length > 0, 'control: these flows do log something');
  assert.equal(logged.some((line) => line.includes('correct horse')), false);
});
