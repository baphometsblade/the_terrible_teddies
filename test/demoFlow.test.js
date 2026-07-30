const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

// End-to-end cover for the demo loop: start a battle, take turns, reach a
// result - carrying the session cookie the way a browser does.
//
// This was never tested before, which is how the following went unnoticed: if
// NODE_ENV happens to be "production" in the shell (it can be inherited from a
// parent process, not just set deliberately), cookie.secure is true, no cookie
// is issued over plain-HTTP localhost, and the demo silently cannot hold state
// between requests. Every turn lands with no battle in progress.
//
// So NODE_ENV is pinned explicitly here rather than inherited.

const SERVER = path.join(__dirname, '..', 'server.js');

function runDemo(env) {
  const probe = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const app = createApp();
    const server = app.listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      let cookie = '';
      const post = async (p, body) => {
        const res = await fetch(base + p, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            ...(cookie ? { cookie } : {})
          },
          body: new URLSearchParams(body).toString(),
          redirect: 'manual'
        });
        const sc = res.headers.getSetCookie();
        if (sc.length) cookie = sc.map(c => c.split(';')[0]).join('; ');
        return res;
      };

      const start = await post('/play/start', { teddyId: '' });
      const gotCookie = cookie.length > 0;

      let turns = 0, finished = false, redirected = false;
      for (let i = 0; i < 40; i++) {
        const res = await post('/play/turn', { move: i % 2 ? 'special' : 'attack' });
        if (res.status === 302) { redirected = true; break; }
        const html = await res.text();
        turns++;
        if (/Victory|Defeat/.test(html)) { finished = true; break; }
      }

      process.stdout.write(JSON.stringify({
        startStatus: start.status, gotCookie, turns, finished, redirected
      }));
      process.exit(0);
    });
  `;

  const result = spawnSync(process.execPath, ['-e', probe], {
    env: {
      ...process.env,
      DEMO_MODE: 'true',
      DATABASE_URL: '',
      SESSION_SECRET: 'demo-flow-test',
      ...env
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });

  return JSON.parse(result.stdout || '{}');
}

test('a demo battle can be played from start to finish', () => {
  const r = runDemo({ NODE_ENV: 'development' });

  assert.equal(r.startStatus, 200);
  assert.equal(r.gotCookie, true, 'starting a battle must issue a session cookie');
  assert.equal(r.redirected, false, 'the battle should persist between requests');
  assert.ok(r.turns > 0, 'at least one turn should be played');
  assert.equal(r.finished, true, `battle should reach a result, played ${r.turns} turns`);
});

test('taking a turn with no battle in progress redirects to /play', () => {
  // Previously this rendered a page with battle undefined: nothing happened and
  // the player was told nothing.
  const probe = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const server = createApp().listen(0, async () => {
      const res = await fetch('http://127.0.0.1:' + server.address().port + '/play/turn', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'move=attack',
        redirect: 'manual'
      });
      process.stdout.write(String(res.status));
      process.exit(0);
    });
  `;
  const result = spawnSync(process.execPath, ['-e', probe], {
    env: { ...process.env, NODE_ENV: 'development', DEMO_MODE: 'true', DATABASE_URL: '', SESSION_SECRET: 's' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });

  assert.equal((result.stdout || '').trim(), '302');
});

test('secure cookies in production mean the demo needs HTTPS', () => {
  // Documents the trap rather than asserting it is fine: under NODE_ENV=production
  // over plain HTTP, no cookie is issued and the demo cannot hold state. Deploys
  // must terminate TLS (and set trust proxy, which server.js does).
  const r = runDemo({ NODE_ENV: 'production' });

  assert.equal(r.gotCookie, false, 'a secure cookie is correctly withheld over plain HTTP');
  assert.equal(r.redirected, true, 'so the battle cannot persist - this is why npm run dev pins NODE_ENV');
});
