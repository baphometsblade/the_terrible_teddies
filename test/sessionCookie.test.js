const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Pins the secure-cookie rule.
//
// The original logic required BOTH NODE_ENV=production AND
// FORCE_SECURE_COOKIES=true, so a normal production deploy sent session cookies
// over plain HTTP. It is now on by default in production with an explicit
// opt-out - and .env.example previously shipped FORCE_SECURE_COOKIES=false,
// which would have silently reintroduced the bug for anyone who copied it.
//
// server.js reads NODE_ENV when createApp() runs, so each case needs a fresh
// process with its own environment.

const SERVER = path.join(__dirname, '..', 'server.js');

function sessionCookieUnder(env) {
  const probe = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const app = createApp();
    const server = app.listen(0, async () => {
      const port = server.address().port;
      // POST /play/start writes req.session.demoBattle, which is what causes a
      // cookie to be issued at all (saveUninitialized is false).
      // X-Forwarded-Proto mimics a TLS-terminating proxy such as Render.
      // Without it, a secure cookie is withheld entirely on a plain HTTP
      // connection and we could not tell "secure" from "no cookie issued".
      // This also exercises the trust-proxy setting, which is what makes
      // secure cookies work behind such a proxy at all.
      const res = await fetch('http://127.0.0.1:' + port + '/play/start', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-forwarded-proto': 'https'
        },
        body: 'teddyId='
      });
      const cookie = (res.headers.getSetCookie() || []).find(c => c.startsWith('tt.sid'));
      if (!cookie) { process.stdout.write('NO_COOKIE'); process.exit(0); }
      process.stdout.write(cookie.toLowerCase().includes('secure') ? 'SECURE' : 'NOT_SECURE');
      process.exit(0);
    });
  `;

  // spawnSync, not execFileSync: calling process.exit() while the HTTP server
  // still has live handles makes Node abort on Windows. The answer is already
  // on stdout by then, and spawnSync does not throw on a non-zero exit.
  const result = spawnSync(process.execPath, ['-e', probe], {
    env: {
      ...process.env,
      DEMO_MODE: 'true',
      DATABASE_URL: '',
      SESSION_SECRET: 'test-secret',
      ...env
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });

  return (result.stdout || '').trim();
}

test('production sets a Secure session cookie by default', () => {
  assert.equal(
    sessionCookieUnder({ NODE_ENV: 'production', FORCE_SECURE_COOKIES: '' }),
    'SECURE',
    'production must default to secure cookies'
  );
});

test('production honours an explicit FORCE_SECURE_COOKIES=false opt-out', () => {
  assert.equal(
    sessionCookieUnder({ NODE_ENV: 'production', FORCE_SECURE_COOKIES: 'false' }),
    'NOT_SECURE',
    'an explicit opt-out must still be respected'
  );
});

test('development does not set a Secure cookie', () => {
  // Otherwise the cookie is never sent over plain-HTTP localhost and login
  // silently fails during development.
  assert.equal(
    sessionCookieUnder({ NODE_ENV: 'development', FORCE_SECURE_COOKIES: '' }),
    'NOT_SECURE'
  );
});
