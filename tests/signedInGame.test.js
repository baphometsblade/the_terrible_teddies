const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const mongoose = require('mongoose');

const User = require('../models/User');
const Player = require('../models/Player');
const Teddy = require('../models/Teddy');
const Team = require('../models/Team');
const Challenge = require('../models/Challenge');
const MarketItem = require('../models/MarketItem');
const Event = require('../models/Event');
const Arena = require('../models/Arena');
const Boss = require('../models/Boss');
const Skin = require('../models/Skin');
const { DEMO_TEDDIES } = require('../data/demoTeddies');
const { completeChallenge } = require('../services/challengeService');

// The signed-in game, played against a real MongoDB.
//
// Everything behind the login needs MongoDB: accounts, battles that award
// experience, the market, teams, challenges, events and the boss fight. The
// other tests stub the models or only check that these routes refuse strangers,
// so none of it had ever run against a database. This file starts the real
// server (node server.js) against a throwaway database, seeds it, plays the game
// over HTTP the way a browser would, and then looks at what was written.
//
// It runs when TEST_DATABASE_URL is set, as it is in CI, where MongoDB runs as a
// service container:
//
//   TEST_DATABASE_URL=mongodb://localhost:27017/teddies_test npm test
//
// The database it names is emptied before the run and dropped after it, so its
// name must end in _test. Pointing this at a real database by mistake fails here
// instead of wiping it.

const TEST_DB = process.env.TEST_DATABASE_URL;
// In GitHub Actions the database is always there, so a missing URL is a broken
// workflow, not a reason to skip: skipping would turn CI green with none of
// this having run.
const IN_CI = process.env.GITHUB_ACTIONS === 'true';
const SKIP = TEST_DB || IN_CI ? false : 'TEST_DATABASE_URL is not set (see the top of this file)';
const SERVER = path.join(__dirname, '..', 'server.js');
const PASSWORD = 'correct horse battery';

function databaseName(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(String(uri || ''));
  return match ? decodeURIComponent(match[1]) : '';
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The real server, started the way production starts it, against TEST_DB.
async function startServer() {
  const port = await freePort();
  const child = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DATABASE_URL: TEST_DB,
      DEMO_MODE: 'false',
      SESSION_SECRET: 'signed-in-game-test',
      // Each browser below reports its own address in this header, so each gets
      // its own rate-limit allowance, as separate visitors would.
      CLIENT_IP_HEADER: 'X-Test-Visitor',
      PORT: String(port)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const server = { child, port, output: '', exit: null };
  const collect = (chunk) => { server.output += chunk; };
  child.stdout.setEncoding('utf8').on('data', collect);
  child.stderr.setEncoding('utf8').on('data', collect);
  server.exited = new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      server.exit = { code, signal };
      resolve(server.exit);
    });
  });

  const deadline = Date.now() + 30000;
  while (!/Terrible Teddies running at/.test(server.output)) {
    if (server.exit) throw new Error(`the server exited while starting:\n${server.output}`);
    if (Date.now() > deadline) {
      child.kill('SIGKILL');
      throw new Error(`the server did not start within 30 seconds:\n${server.output}`);
    }
    await sleep(25);
  }
  return server;
}

async function stopServer(server) {
  if (server.exit) return;
  server.child.kill('SIGTERM');
  let timer;
  const gaveUp = new Promise((resolve) => { timer = setTimeout(() => resolve(null), 10000); });
  const exit = await Promise.race([server.exited, gaveUp]);
  clearTimeout(timer);
  if (!exit) server.child.kill('SIGKILL');
}

// A browser: one visitor address and one cookie jar. `live.port` is read on
// every request, so a browser keeps its session across a server restart.
let visitors = 0;
function browser(live) {
  const visitor = `10.77.0.${++visitors}`;
  let cookie = '';

  function parts({ form, json } = {}) {
    const body = form ? new URLSearchParams(form).toString() : json !== undefined ? JSON.stringify(json) : null;
    const headers = { 'X-Test-Visitor': visitor };
    if (cookie) headers.Cookie = cookie;
    if (form) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    if (json !== undefined) headers['Content-Type'] = 'application/json';
    if (body !== null) headers['Content-Length'] = Buffer.byteLength(body);
    return { body, headers };
  }

  function send(method, urlPath, options) {
    const { body, headers } = parts(options);
    return new Promise((resolve, reject) => {
      const req = http.request(
        { host: '127.0.0.1', port: live.port, method, path: urlPath, headers, agent: false },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            for (const line of res.headers['set-cookie'] || []) {
              const pair = line.split(';')[0];
              if (pair.startsWith('tt.sid=')) cookie = pair === 'tt.sid=' ? '' : pair;
            }
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          });
        }
      );
      req.on('error', reject);
      if (body !== null) req.write(body);
      req.end();
    });
  }

  // The bytes of one request, for burst() below.
  function raw(method, urlPath, options) {
    const { body, headers } = parts(options);
    const lines = Object.entries(headers).map(([key, value]) => `${key}: ${value}\r\n`).join('');
    return `${method} ${urlPath} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n${lines}\r\n${body || ''}`;
  }

  return {
    visitor,
    raw,
    get cookie() { return cookie; },
    set cookie(value) { cookie = value; },
    get: (urlPath, options) => send('GET', urlPath, options),
    post: (urlPath, options) => send('POST', urlPath, options)
  };
}

const json = (res) => JSON.parse(res.body);

// Requests that reach the server together. Each gets its own connection, all
// the connections are opened first, and then every request is written in the
// same moment. Promise.all over ordinary requests can arrive one after another
// on a busy machine, and then a race the server would lose never happens.
// Returns the status codes in the order given.
async function burst(live, requests) {
  const sockets = await Promise.all(requests.map(() => new Promise((resolve, reject) => {
    const socket = net.connect(live.port, '127.0.0.1', () => resolve(socket));
    socket.once('error', reject);
  })));
  const replies = sockets.map((socket) => new Promise((resolve) => {
    let data = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => { data += chunk; });
    socket.on('error', () => resolve(data));
    socket.on('close', () => resolve(data));
  }));
  sockets.forEach((socket, i) => {
    const { browser: b, method = 'POST', path: urlPath, ...options } = requests[i];
    socket.write(b.raw(method, urlPath, options));
  });
  const texts = await Promise.all(replies);
  return texts.map((text) => Number((/^HTTP\/1\.1 (\d{3})/.exec(text) || [])[1]));
}

const times = (count, request) => Array.from({ length: count }, () => request);

async function signUpAndIn(b, username) {
  const registered = await b.post('/auth/register', { form: { username, password: PASSWORD } });
  assert.equal(registered.status, 302, `register ${username}: ${registered.status} ${registered.body}`);
  const login = await b.post('/auth/login', { form: { username, password: PASSWORD } });
  assert.equal(login.status, 302, `login ${username}: ${login.status} ${login.body}`);
  assert.equal(login.headers.location, '/');
  assert.ok(b.cookie, 'signing in should set a session cookie');
  const user = await User.findOne({ username });
  const player = await Player.findOne({ user: user._id });
  return { user, player };
}

async function playToTheEnd(b, move = 'attack') {
  for (let turn = 0; turn < 60; turn++) {
    const res = await b.post('/game/execute-turn', { json: { move } });
    assert.equal(res.status, 200, `turn ${turn}: ${res.status} ${res.body}`);
    const state = json(res);
    if (state.status === 'finished') return state;
  }
  return assert.fail('the battle did not finish within 60 turns');
}

async function seedWorld() {
  const teddies = await Teddy.insertMany(DEMO_TEDDIES.map(({ _id, ...teddy }) => teddy));
  const arena = await Arena.create({ name: 'Lint Trap Arena', difficulty: 3, environment: 'Laundry room', isEndGame: true });
  // 15 health: a single teddy with more than 15 attack beats it, one with 15 or less does not.
  const boss = await Boss.create({ name: 'The Dryer', health: 15, attackDamage: 9, specialMove: 'Static Cling', arena: arena._id });
  const now = Date.now();
  const challenge = await Challenge.create({
    title: 'Win a battle', description: 'Win one battle today.', type: 'daily', difficulty: 'easy', reward: 10, isActive: true
  });
  const retired = await Challenge.create({
    title: 'Retired challenge', description: 'No longer offered.', type: 'weekly', difficulty: 'hard', reward: 50, isActive: false
  });
  await Event.create({
    title: 'Fluff Festival', description: 'Double stuffing.', isActive: true,
    startDate: new Date(now - 60 * 60 * 1000), endDate: new Date(now + 60 * 60 * 1000)
  });
  await Event.create({
    title: 'Last week', description: 'Already over.', isActive: true,
    startDate: new Date(now - 8 * 24 * 60 * 60 * 1000), endDate: new Date(now - 7 * 24 * 60 * 60 * 1000)
  });
  const skin = await Skin.create({ name: 'Sequin Cape', imageUrl: '/assets/skins/sequin-cape.png' });
  return {
    teddy: Object.fromEntries(teddies.map((teddy) => [teddy.name, teddy])),
    arena, boss, challenge, retired, skin
  };
}

test('the signed-in game, against a real MongoDB', { skip: SKIP, timeout: 300000 }, async (t) => {
  assert.ok(TEST_DB, 'GitHub Actions runs this file without TEST_DATABASE_URL; the workflow should set it');
  const name = databaseName(TEST_DB);
  assert.match(name, /_test$/, `TEST_DATABASE_URL names the database "${name}". It must end in _test, because this test deletes everything in it.`);

  await mongoose.connect(TEST_DB, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
  const live = { port: 0 };
  let server = null;

  try {
    await mongoose.connection.dropDatabase();
    await Promise.all([User, Player, Teddy, Team, Challenge, MarketItem, Event, Arena, Boss, Skin].map((model) => model.createIndexes()));
    const world = await seedWorld();

    server = await startServer();
    live.port = server.port;
    const ada = browser(live);
    const bea = browser(live);
    const cal = browser(live);
    const stranger = browser(live);
    const people = {};

    await t.test('the server runs on the database, not in demo mode', async () => {
      const health = json(await stranger.get('/health'));
      assert.equal(health.demoMode, false);
      assert.equal(health.databaseConfigured, true);
      assert.match(server.output, /Database connected successfully/);
      const home = await stranger.get('/');
      assert.equal(home.status, 200);
      assert.match(home.body, /href="\/auth\/login"/, 'with a database the home page offers a login');
    });

    await t.test('registering creates an account with a hashed password and a linked game profile', async () => {
      const res = await ada.post('/auth/register', { form: { username: 'ada', password: PASSWORD } });
      assert.equal(res.status, 302, res.body);
      assert.equal(res.headers.location, '/auth/login');

      const user = await User.findOne({ username: 'ada' });
      assert.ok(user, 'the account was not written');
      assert.notEqual(user.password, PASSWORD);
      assert.match(user.password, /^\$2[aby]\$10\$/, 'the password should be stored as a bcrypt hash');
      const player = await Player.findOne({ user: user._id });
      assert.ok(player, 'registration should create the game profile');
      assert.equal(player.username, 'ada');
    });

    await t.test('a taken username is refused, and no second account or profile is left behind', async () => {
      const res = await bea.post('/auth/register', { form: { username: 'ada', password: PASSWORD } });
      assert.equal(res.status, 409, res.body);
      assert.equal(await User.countDocuments({ username: 'ada' }), 1);
      assert.equal(await Player.countDocuments({ username: 'ada' }), 1);
    });

    await t.test('a short password is refused before anything is written', async () => {
      const res = await bea.post('/auth/register', { form: { username: 'shorty', password: 'short' } });
      assert.equal(res.status, 400, res.body);
      assert.equal(await User.countDocuments({ username: 'shorty' }), 0);
      assert.equal(await Player.countDocuments({ username: 'shorty' }), 0);
    });

    await t.test('a wrong password is refused; the right one signs in, and the pages say so', async () => {
      const wrong = await ada.post('/auth/login', { form: { username: 'ada', password: 'not the password' } });
      assert.equal(wrong.status, 401);
      assert.equal(wrong.body, 'Invalid username or password.');
      assert.equal(ada.cookie, '', 'a failed login must not start a session');

      const right = await ada.post('/auth/login', { form: { username: 'ada', password: PASSWORD } });
      assert.equal(right.status, 302, right.body);
      assert.equal(right.headers.location, '/');
      assert.ok(ada.cookie, 'signing in should set a session cookie');

      const home = await ada.get('/');
      assert.match(home.body, /\/auth\/logout/);
      people.ada = { user: await User.findOne({ username: 'ada' }) };
      people.ada.player = await Player.findOne({ user: people.ada.user._id });
    });

    await t.test('the session is kept in MongoDB and survives a server restart', async () => {
      const sessions = mongoose.connection.db.collection('sessions');
      const stored = await sessions.find({}).toArray();
      assert.ok(
        stored.some((doc) => String(doc.session).includes(String(people.ada.user._id))),
        'the signed-in session should be in the sessions collection'
      );

      await stopServer(server);
      server = await startServer();
      live.port = server.port;

      const res = await ada.get('/teddies');
      assert.equal(res.status, 200, `still signed in after a restart? ${res.status} ${res.body.slice(0, 120)}`);
    });

    await t.test('the teddies page lists every teddy in the database', async () => {
      const res = await ada.get('/teddies');
      assert.equal(res.status, 200);
      for (const teddyName of Object.keys(world.teddy)) {
        assert.ok(res.body.includes(teddyName.replace(/'/g, '&#39;')), `${teddyName} is missing from the page`);
      }
    });

    await t.test('a lineup has to be a list of teddies that exist', async () => {
      assert.equal((await ada.post('/game/choose-lineup', { json: { lineup: 'everyone' } })).status, 400);
      assert.equal((await ada.post('/game/choose-lineup', { json: { lineup: [] } })).status, 400);
      const ghost = new mongoose.Types.ObjectId();
      const res = await ada.post('/game/choose-lineup', { json: { lineup: [String(world.teddy['Penny Patches']._id), String(ghost)] } });
      assert.equal(res.status, 404, res.body);
    });

    await t.test('a battle plays to a result, and both teddies gain experience from it', async () => {
      const mine = world.teddy['Captain Grumblefluff'];
      const theirs = world.teddy['Penny Patches'];
      const chosen = await ada.post('/game/choose-lineup', { json: { lineup: [String(mine._id), String(theirs._id)] } });
      assert.equal(chosen.status, 200, chosen.body);

      const started = await ada.post('/game/initiate-battle');
      assert.equal(started.status, 200, started.body);
      const battle = json(started);
      assert.equal(battle.status, 'active');
      assert.equal(battle.player.name, mine.name);
      assert.equal(battle.opponent.name, theirs.name);

      const page = await ada.get('/game/battle');
      assert.equal(page.status, 200);
      assert.match(page.body, /Captain Grumblefluff/);

      const end = await playToTheEnd(ada);
      assert.ok(['player', 'opponent'].includes(end.winner), `winner: ${end.winner}`);
      const [after, afterTheirs] = await Promise.all([Teddy.findById(mine._id), Teddy.findById(theirs._id)]);
      assert.equal(after.experience, end.winner === 'player' ? 25 : 10);
      assert.equal(afterTheirs.experience, end.winner === 'opponent' ? 25 : 10);

      const again = await ada.post('/game/execute-turn', { json: { move: 'attack' } });
      assert.equal(again.status, 409, 'a finished battle takes no more turns');
    });

    await t.test('reaching 100 experience levels a teddy up', async () => {
      const mine = world.teddy['Captain Grumblefluff'];
      const theirs = world.teddy['Penny Patches'];
      await Teddy.updateMany({ _id: { $in: [mine._id, theirs._id] } }, { $set: { experience: 95 } });
      const before = await Teddy.find({ _id: { $in: [mine._id, theirs._id] } }).lean();

      await ada.post('/game/choose-lineup', { json: { lineup: [String(mine._id), String(theirs._id)] } });
      await ada.post('/game/initiate-battle');
      const end = await playToTheEnd(ada, 'special');
      const winnerId = String(end.winner === 'player' ? mine._id : theirs._id);

      for (const old of before) {
        const now = await Teddy.findById(old._id);
        const gained = String(old._id) === winnerId ? 25 : 10;
        assert.equal(now.level, old.level + 1, `${old.name} should be one level up`);
        assert.equal(now.health, old.health + 10);
        assert.equal(now.attackDamage, old.attackDamage + 5);
        assert.equal(now.experience, 95 + gained - 100, `${old.name}: what is left over carries into the next level`);
      }
    });

    await t.test('the end game: arenas and bosses, and a battle set up against one', async () => {
      const content = await ada.get('/game/end-game');
      assert.equal(content.status, 200, content.body);
      const { arenas, bosses } = json(content);
      assert.deepEqual(arenas.map((arena) => arena.name), ['Lint Trap Arena']);
      assert.equal(bosses[0].name, 'The Dryer');
      assert.equal(bosses[0].arena.name, 'Lint Trap Arena', 'the boss should come with its arena');

      const setup = await ada.post('/game/initiate-end-game-battle', {
        json: { playerTeddyId: String(world.teddy['Lord Lint']._id), arenaId: String(world.arena._id) }
      });
      assert.equal(setup.status, 200, setup.body);
      const battle = json(setup);
      assert.equal(battle.player.name, 'Lord Lint');
      assert.equal(battle.opponent.name, 'The Dryer');
      assert.equal(battle.arena.name, 'Lint Trap Arena');

      const gui = await ada.get('/game/arena-gui');
      assert.equal(gui.status, 200);
      assert.match(gui.body, /The Dryer/);
    });

    await t.test('an end-game battle with a bad or unknown id is answered 400 or 404, not 500', async () => {
      const teddyId = String(world.teddy['Lord Lint']._id);
      const bad = await ada.post('/game/initiate-end-game-battle', { json: { playerTeddyId: 'nope', arenaId: String(world.arena._id) } });
      assert.equal(bad.status, 400, bad.body);
      const unknown = await ada.post('/game/initiate-end-game-battle', {
        json: { playerTeddyId: teddyId, arenaId: String(new mongoose.Types.ObjectId()) }
      });
      assert.equal(unknown.status, 404, unknown.body);
    });

    await t.test('a listing can be made once, is shown to everyone, and is bought exactly once', async () => {
      people.bea = await signUpAndIn(bea, 'bea');
      people.cal = await signUpAndIn(cal, 'cal');
      const teddyId = String(world.teddy['Sir Stuffs-a-Lot']._id);

      const listed = await ada.post('/market/sell', { form: { teddyId, price: '40' } });
      assert.equal(listed.status, 302, listed.body);
      assert.equal((await ada.post('/market/sell', { form: { teddyId, price: '40' } })).status, 409, 'listed twice');

      const market = await stranger.get('/market');
      assert.equal(market.status, 200);
      assert.match(market.body, /Sir Stuffs-a-Lot/);

      const item = await MarketItem.findOne({ teddy: teddyId });
      assert.equal(String(item.owner), String(people.ada.user._id));
      assert.equal((await ada.post(`/market/buy/${item._id}`)).status, 400, 'buying your own listing');

      const bought = await bea.post(`/market/buy/${item._id}`);
      assert.equal(bought.status, 302, bought.body);
      assert.equal((await MarketItem.findById(item._id)).status, 'sold');
      assert.equal(String((await Teddy.findById(teddyId)).owner), String(people.bea.user._id));

      assert.equal((await cal.post(`/market/buy/${item._id}`)).status, 409, 'a sold item cannot be bought again');
      assert.doesNotMatch((await stranger.get('/market')).body, /Sir Stuffs-a-Lot/, 'a sold item leaves the market');
      assert.equal((await ada.post('/market/sell', { form: { teddyId, price: '40' } })).status, 403, 'selling a teddy you no longer own');
    });

    await t.test('listing one teddy several times at once: only one listing is accepted', async () => {
      const teddyId = String(world.teddy['Lord Lint']._id);
      const statuses = await burst(live, times(8, { browser: ada, path: '/market/sell', form: { teddyId, price: '99' } }));
      const listed = await MarketItem.countDocuments({ teddy: teddyId, status: 'available' });
      assert.equal(listed, 1, `listed ${listed} times; answers ${statuses}`);
      assert.deepEqual(statuses.sort(), [302, ...Array(7).fill(409)]);
    });

    await t.test('the database itself refuses a second available listing of a teddy', async () => {
      // The race above depends on timing; this does not. It is the index that
      // makes a duplicate impossible, so check the index directly.
      const teddy = world.teddy['Lord Lint']._id;
      await assert.rejects(
        MarketItem.create({ owner: people.ada.user._id, teddy, price: 5 }),
        (error) => error.code === 11000
      );
      // A sold listing is outside the index, so a teddy can be listed again after a sale.
      await MarketItem.create({ owner: people.ada.user._id, teddy, price: 5, status: 'sold' });
      await MarketItem.deleteOne({ teddy, status: 'sold' });
    });

    await t.test('two buyers racing for one listing: exactly one gets it', async () => {
      const teddyId = String(world.teddy['Captain Grumblefluff']._id);
      assert.equal((await ada.post('/market/sell', { form: { teddyId, price: '10' } })).status, 302);
      const item = await MarketItem.findOne({ teddy: teddyId, status: 'available' });

      const [forBea, forCal] = await burst(live, [
        { browser: bea, path: `/market/buy/${item._id}` },
        { browser: cal, path: `/market/buy/${item._id}` }
      ]);
      assert.deepEqual([forBea, forCal].sort(), [302, 409], `bea ${forBea}, cal ${forCal}`);
      const winner = forBea === 302 ? people.bea : people.cal;
      assert.equal(String((await Teddy.findById(teddyId)).owner), String(winner.user._id));
      people.grumblefluffOwner = winner === people.bea ? 'bea' : 'cal';
    });

    await t.test("customising checks who owns the teddy", async () => {
      const skinId = String(world.skin._id);
      const unowned = String(world.teddy['Penny Patches']._id);
      const ok = await ada.post('/api/teddies/customize', { json: { teddyId: unowned, skinId } });
      assert.equal(ok.status, 200, ok.body);
      assert.deepEqual((await Teddy.findById(unowned)).skins.map(String), [skinId]);

      const madeUp = await ada.post('/api/teddies/customize', { json: { teddyId: unowned, skinId: String(new mongoose.Types.ObjectId()) } });
      assert.equal(madeUp.status, 404, 'a skin that does not exist');
      assert.deepEqual((await Teddy.findById(unowned)).skins.map(String), [skinId], 'nothing was added');

      const beasTeddy = String(world.teddy['Sir Stuffs-a-Lot']._id);
      assert.equal((await ada.post('/api/teddies/customize', { json: { teddyId: beasTeddy, skinId } })).status, 403);
      assert.equal((await bea.post('/api/teddies/customize', { json: { teddyId: beasTeddy, skinId } })).status, 200);
    });

    await t.test('a team starts with its creator, and only members can add others', async () => {
      const created = await ada.post('/teams/create', { json: { name: 'Alpha' } });
      assert.equal(created.status, 201, created.body);
      const team = json(created).team;
      assert.deepEqual(team.members.map(String), [String(people.ada.player._id)]);

      assert.equal((await bea.post('/teams/create', { json: { name: 'Alpha' } })).status, 409, 'team names are unique');

      const intruder = await bea.post(`/teams/${team._id}/addMember`, { json: { memberId: String(people.bea.player._id) } });
      assert.equal(intruder.status, 403, 'a non-member cannot add anyone');

      const added = await ada.post(`/teams/${team._id}/addMember`, { json: { memberId: String(people.bea.player._id) } });
      assert.equal(added.status, 200, added.body);
      assert.equal((await ada.post(`/teams/${team._id}/addMember`, { json: { memberId: String(people.bea.player._id) } })).status, 409);
      assert.equal(
        (await ada.post(`/teams/${team._id}/addMember`, { json: { memberId: String(new mongoose.Types.ObjectId()) } })).status,
        404,
        'adding a player who does not exist'
      );
      assert.equal((await ada.post('/teams/nope/addMember', { json: { memberId: 'nope' } })).status, 400);

      const stored = await Team.findById(team._id);
      assert.deepEqual(stored.members.map(String).sort(), [String(people.ada.player._id), String(people.bea.player._id)].sort());
    });

    await t.test('adding the same member several times at once adds them once', async () => {
      const team = await Team.findOne({ name: 'Alpha' });
      const memberId = String(people.cal.player._id);
      const statuses = await burst(live, times(6, { browser: ada, path: `/teams/${team._id}/addMember`, json: { memberId } }));
      const stored = await Team.findById(team._id);
      assert.equal(stored.members.filter((id) => String(id) === memberId).length, 1, `answers ${statuses}`);
      assert.deepEqual(statuses.sort(), [200, ...Array(5).fill(409)]);
    });

    await t.test('creating a team with a player who does not exist is answered 400 or 404, not 500', async () => {
      const res = await cal.post('/teams/create', { json: { name: 'Ghosts', members: [String(new mongoose.Types.ObjectId())] } });
      assert.ok([400, 404].includes(res.status), `got ${res.status}: ${res.body}`);
      assert.equal(await Team.countDocuments({ name: 'Ghosts' }), 0);
    });

    await t.test('challenges: only active ones are offered, and each can be completed once', async () => {
      const active = await stranger.get('/challenges/active');
      assert.equal(active.status, 200);
      assert.deepEqual(json(active).map((challenge) => challenge.title), ['Win a battle']);

      const page = await stranger.get('/challenges');
      assert.equal(page.status, 200);
      assert.match(page.body, /Win a battle/);

      const challengeId = String(world.challenge._id);
      const done = await ada.post('/challenges/complete', { form: { challengeId } });
      assert.equal(done.status, 200, done.body);
      assert.equal((await ada.post('/challenges/complete', { form: { challengeId } })).status, 409);
      assert.equal((await ada.post('/challenges/complete', { form: { challengeId: String(world.retired._id) } })).status, 404);
      assert.equal((await ada.post('/challenges/complete', { form: { challengeId: 'nope' } })).status, 400);

      const player = await Player.findById(people.ada.player._id);
      assert.equal(player.completedChallenges.length, 1);
      assert.equal(String(player.completedChallenges[0].challengeId), challengeId);
    });

    await t.test('completing a challenge several times at once records it once', async () => {
      const challengeId = String(world.challenge._id);
      const statuses = await burst(live, times(6, { browser: cal, path: '/challenges/complete', form: { challengeId } }));
      const player = await Player.findById(people.cal.player._id);
      assert.equal(player.completedChallenges.length, 1, `recorded ${player.completedChallenges.length} times; answers ${statuses}`);
      assert.deepEqual(statuses.sort(), [200, ...Array(5).fill(409)]);
    });

    await t.test('a challenge is recorded once even from a stale copy of the player', async () => {
      // The burst above depends on timing; this does not. Two requests that
      // load the player before either writes hold copies like these.
      const first = await Player.findById(people.bea.player._id);
      const second = await Player.findById(people.bea.player._id);
      assert.equal((await completeChallenge(first, world.challenge)).alreadyCompleted, false);
      assert.equal((await completeChallenge(second, world.challenge)).alreadyCompleted, true);
      assert.equal((await Player.findById(people.bea.player._id)).completedChallenges.length, 1);
    });

    await t.test('events: only the ones running now are listed', async () => {
      const res = await stranger.get('/api/events');
      assert.equal(res.status, 200, res.body);
      assert.deepEqual(json(res).map((event) => event.title), ['Fluff Festival']);
    });

    await t.test("the boss fight counts the player's own teddies", async () => {
      const bossId = String(world.boss._id);
      assert.equal((await stranger.get(`/api/boss-fight?bossId=${bossId}`)).status, 401);
      assert.equal((await ada.get('/api/boss-fight?bossId=nope')).status, 400);
      assert.equal((await ada.get(`/api/boss-fight?bossId=${new mongoose.Types.ObjectId()}`)).status, 404);

      // ada owns nothing any more; whoever won the race owns Captain Grumblefluff (18 attack, the boss has 15 health).
      const lost = json(await ada.get(`/api/boss-fight?bossId=${bossId}`));
      assert.equal(lost.victory, false);
      const owner = people.grumblefluffOwner === 'bea' ? bea : cal;
      const won = json(await owner.get(`/api/boss-fight?bossId=${bossId}`));
      assert.equal(won.victory, true, JSON.stringify(won));
    });

    await t.test('signing out ends the session in the database too', async () => {
      const sessions = mongoose.connection.db.collection('sessions');
      const before = await sessions.countDocuments();
      const oldCookie = ada.cookie;

      const res = await ada.post('/auth/logout');
      assert.equal(res.status, 302);
      assert.equal(res.headers.location, '/auth/login');
      assert.equal(ada.cookie, '', 'the cookie should be cleared');
      assert.equal(await sessions.countDocuments(), before - 1, 'the session document should be deleted');

      ada.cookie = oldCookie;
      assert.equal((await ada.get('/teddies')).status, 401, 'the old cookie must not work any more');
    });
  } finally {
    if (server) await stopServer(server);
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }
});
