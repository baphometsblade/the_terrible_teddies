const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ejs = require('ejs');

// What a visitor sees, versus what the person running the site sees.
//
// The demo is the default deploy (render.yaml sets DEMO_MODE), so its pages are
// the public face of the game. They carried notes written to the site owner: a
// grey button reading "Set FOUNDER_PACK_URL to enable payments", a home-page
// card telling visitors to set that variable in hosting settings, "Demo mode is
// active" lines, and a Health link. The navbar and home page also offered Login
// and Open Collection, which cannot work without a database and landed on one
// bare line of text.
//
// Operator notes now show everywhere except NODE_ENV=production, so whoever runs
// the site still sees what to configure. Links that can only dead-end are left
// out in demo mode in every environment.

const ROOT = path.join(__dirname, '..');
const SERVER = path.join(ROOT, 'server.js');
const VIEWS = path.join(ROOT, 'views');

const STORE = 'https://pay.example/founder';

function pages(env, routes = ['/', '/play']) {
  const script = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const routes = ${JSON.stringify(routes)};
    const server = createApp().listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      const out = {};
      for (const route of routes) {
        const res = await fetch(base + route, { redirect: 'manual' });
        out[route] = { status: res.status, body: await res.text() };
      }
      process.stdout.write('<<<' + Buffer.from(JSON.stringify(out)).toString('base64') + '>>>');
      process.exit(0);
    });
  `;

  const result = spawnSync(process.execPath, ['-e', script], {
    env: {
      ...process.env,
      DEMO_MODE: 'true',
      DATABASE_URL: '',
      FOUNDER_PACK_URL: '',
      SESSION_SECRET: 'operator-notes-test',
      ...env
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 60000
  });

  const match = /<<<([A-Za-z0-9+/=]*)>>>/.exec(result.stdout || '');
  assert.ok(match, `could not read the probe output (exit ${result.status})`);
  return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
}

const NOTES = ['FOUNDER_PACK_URL', 'Demo mode is active', 'href="/health"'];

test('development: the notes for whoever runs the site are shown', () => {
  const out = pages({ NODE_ENV: 'development' });

  assert.equal(out['/'].status, 200);
  assert.equal(out['/play'].status, 200);
  for (const note of NOTES) {
    assert.ok(out['/'].body.includes(note), `the home page should show "${note}" in development`);
  }
  assert.ok(out['/play'].body.includes('Set FOUNDER_PACK_URL to enable payments'));
  assert.ok(out['/play'].body.includes('Demo mode is active'));
});

test('production: a visitor sees none of them', () => {
  const out = pages({ NODE_ENV: 'production' });

  for (const route of ['/', '/play']) {
    assert.equal(out[route].status, 200, route);
    for (const note of NOTES) {
      assert.ok(!out[route].body.includes(note), `${route} must not show "${note}" to a visitor`);
    }
    assert.ok(out[route].body.includes('href="/play"'), `${route} should still link to the demo`);
  }
});

test('production with a store link: the Founder Pack button goes there', () => {
  const out = pages({ NODE_ENV: 'production', FOUNDER_PACK_URL: STORE }, ['/play']);
  const { body } = out['/play'];

  assert.ok(body.includes(`href="${STORE}"`));
  assert.ok(body.includes('Buy Founder Pack'));
  assert.ok(!body.includes('FOUNDER_PACK_URL'), 'the variable name is for the owner, not the page');
});

test('demo mode leaves out links that can only dead-end, in every environment', () => {
  for (const NODE_ENV of ['development', 'production']) {
    const out = pages({ NODE_ENV });
    for (const route of ['/', '/play']) {
      assert.ok(
        !out[route].body.includes('/auth/login'),
        `${route} (${NODE_ENV}) should not offer Login without a database`
      );
    }
    assert.ok(
      !out['/'].body.includes('href="/teddies"'),
      `the home page (${NODE_ENV}) should not offer the collection without a database`
    );
  }
});

test('navbar: Login with a database, Logout when signed in, neither in demo mode', async () => {
  const header = (locals) => ejs.renderFile(path.join(VIEWS, 'partials', '_header.ejs'), locals);

  const withDatabase = await header({ demoMode: false, currentUser: null });
  assert.ok(withDatabase.includes('href="/auth/login"'));
  assert.ok(!withDatabase.includes('/auth/logout'));

  const signedIn = await header({ demoMode: false, currentUser: { id: '1', username: 'bear' } });
  assert.ok(signedIn.includes('href="/auth/logout"'));
  assert.ok(!signedIn.includes('/auth/login'));

  const demo = await header({ demoMode: true, currentUser: null });
  assert.ok(!demo.includes('/auth/login'));
  assert.ok(!demo.includes('/auth/logout'));

  const bare = await header({});
  assert.ok(bare.includes('href="/auth/login"'), 'a view that passes nothing keeps the old behaviour');

  const operator = await header({ showOperatorNotes: true });
  assert.ok(operator.includes('href="/health"'));
  assert.ok(!bare.includes('href="/health"'), 'the Health link is for the operator only');
});

test('play: the win message only pushes Founder Packs when there is somewhere to buy one', async () => {
  const fighter = (name) => ({ id: name, name, health: 10, maxHealth: 100, specialMove: 'Cuddle Crush' });
  const render = (winner, founderPackUrl) =>
    ejs.renderFile(path.join(VIEWS, 'play.ejs'), {
      currentUser: null,
      demoMode: true,
      teddies: [],
      selectedTeddyId: null,
      founderPackUrl,
      battle: {
        status: 'finished',
        winner,
        log: ['Bonk'],
        player: fighter('Gus'),
        opponent: fighter('Toby')
      }
    });

  const noStore = await render('player', '');
  assert.ok(noStore.includes('You won the fluff pit.'));
  assert.ok(!noStore.includes('Push Founder Packs'), 'there is nothing to push without a link');

  const withStore = await render('player', STORE);
  assert.ok(withStore.includes('You won the fluff pit. Push Founder Packs now.'));

  for (const url of ['', STORE]) {
    const lost = await render('opponent', url);
    assert.ok(lost.includes('You lost, but the rematch button is free.'));
  }
});
