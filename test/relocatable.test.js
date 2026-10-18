const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Where the server is started from must not matter.
//
// Express resolves a bare 'views' (its default) and express.static('public')
// against process.cwd(). The app was written that way, so starting it from any
// directory but the repo root - a service manager, a deploy hook, `node
// /srv/teddies/server.js` - made every page fail and every stylesheet and the
// favicon 404. Fuzzing the app from the wrong directory by accident is what
// showed it: every page was a 500.
//
// The server is started here from an empty temporary directory.

const ROOT = path.join(__dirname, '..');
const SERVER = path.join(ROOT, 'server.js');

function probeFromElsewhere() {
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-elsewhere-'));

  try {
    const script = `
      const { createApp } = require(${JSON.stringify(SERVER)});
      const paths = ['/', '/play', '/favicon.svg', '/css/style.css', '/no-such-page'];
      const server = createApp().listen(0, async () => {
        const base = 'http://127.0.0.1:' + server.address().port;
        const out = { cwd: process.cwd(), responses: {} };
        for (const p of paths) {
          const res = await fetch(base + p);
          out.responses[p] = { status: res.status, type: res.headers.get('content-type') || '', body: (await res.text()).slice(0, 1200) };
        }
        process.stdout.write('<<<' + Buffer.from(JSON.stringify(out)).toString('base64') + '>>>');
        process.exit(0);
      });
    `;

    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: elsewhere,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DEMO_MODE: 'true',
        DATABASE_URL: '',
        SESSION_SECRET: 'relocatable-test'
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000
    });

    const stdout = result.stdout || '';
    const match = /<<<([A-Za-z0-9+/=]*)>>>/.exec(stdout);
    assert.ok(
      match,
      `probe produced no payload.\nstdout: ${stdout.slice(0, 400)}\nstderr: ${(result.stderr || '').slice(0, 400)}`
    );

    const payload = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
    // Worked out before the directory is removed.
    payload.startedInRepoRoot = fs.realpathSync(payload.cwd) === fs.realpathSync(ROOT);
    return payload;
  } finally {
    fs.rmSync(elsewhere, { recursive: true, force: true });
  }
}

let cached;
const run = () => (cached = cached || probeFromElsewhere());

test('the probe really starts the server somewhere else', () => {
  // Control: if this were the repo root, every test below would pass whatever
  // the app did.
  assert.equal(run().startedInRepoRoot, false);
});

test('pages render when the server is started from another directory', () => {
  const { responses } = run();
  for (const page of ['/', '/play']) {
    assert.equal(responses[page].status, 200, `${page}: ${responses[page].body.slice(0, 120)}`);
    assert.match(responses[page].type, /text\/html/, page);
    assert.match(responses[page].body, /<title>[^<]+<\/title>/, `${page} should be a full page`);
  }
});

test('static files are served when the server is started from another directory', () => {
  const { responses } = run();

  assert.equal(responses['/favicon.svg'].status, 200);
  assert.match(responses['/favicon.svg'].type, /image\/svg\+xml/);
  assert.match(responses['/favicon.svg'].body, /^<svg\b/);

  assert.equal(responses['/css/style.css'].status, 200);
  assert.match(responses['/css/style.css'].type, /text\/css/);
});

test('the 404 page is the real page, not the plain-text fallback', () => {
  const missing = run().responses['/no-such-page'];
  assert.equal(missing.status, 404);
  assert.match(missing.body, /<html\b/, `got: ${missing.body.slice(0, 80)}`);
});
