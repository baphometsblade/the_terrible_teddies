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

function runDemo(env, proxyHeaders = {}) {
  const probe = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const extraHeaders = ${JSON.stringify(proxyHeaders)};
    const app = createApp();
    const server = app.listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      let cookie = '';
      let secureCookie = false;
      const post = async (p, body) => {
        const res = await fetch(base + p, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            ...extraHeaders,
            ...(cookie ? { cookie } : {})
          },
          body: new URLSearchParams(body).toString(),
          redirect: 'manual'
        });
        const sc = res.headers.getSetCookie();
        if (sc.length) {
          cookie = sc.map(c => c.split(';')[0]).join('; ');
          secureCookie = sc.every(c => c.toLowerCase().includes('; secure'));
        }
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
        startStatus: start.status, gotCookie, secureCookie, turns, finished, redirected
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

test('production behind a TLS-terminating proxy, as on Render, plays a battle to the end', () => {
  // render.yaml deploys with NODE_ENV=production, and Render terminates TLS and
  // forwards X-Forwarded-Proto: https. That is the public deployment, and
  // nothing exercised it: the development run above does not use secure cookies,
  // and the production run above sends no proxy header. This one sends what
  // Render sends, so a broken trust-proxy setup would fail here instead of
  // silently resetting every battle for every visitor.
  const r = runDemo(
    { NODE_ENV: 'production' },
    { 'x-forwarded-proto': 'https', 'x-forwarded-for': '203.0.113.7' }
  );

  assert.equal(r.gotCookie, true, 'a cookie is issued once the proxy says the request was HTTPS');
  assert.equal(r.secureCookie, true, 'and it is marked Secure');
  assert.equal(r.redirected, false, 'the battle should persist between requests');
  assert.equal(r.finished, true, `battle should reach a result, played ${r.turns} turns`);
});