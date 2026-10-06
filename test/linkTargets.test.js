const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Every internal link a view hard-codes must lead somewhere.
//
// views/partials/_nav.ejs linked to /login, /register and /logout. The routes
// are /auth/login, /auth/register and /auth/logout, so all three 404'd - on
// every page that used that navbar. formActions.test.js checks <form action>,
// but nothing looked at <a href>.
//
// A 401, 302 or 503 counts as "exists": the route is there and auth or the
// database guard simply stands in the way. Only a 404 is a broken link.

const ROOT = path.join(__dirname, '..');
const SERVER = path.join(ROOT, 'server.js');
const VIEWS = path.join(ROOT, 'views');
const PUBLIC_DIR = path.join(ROOT, 'public');

function viewSources() {
  return fs
    .readdirSync(VIEWS, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.ejs'))
    .map((file) => ({
      file,
      // Comments never reach the browser, so a link quoted in one is not a link.
      source: fs
        .readFileSync(path.join(VIEWS, file), 'utf8')
        .replace(/<%#[\s\S]*?%>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
    }));
}

// { "/auth/login": ["partials/_nav.ejs", ...] }
function staticLinks() {
  const links = new Map();
  const patterns = [
    /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi,
    /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi,
    /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi
  ];

  for (const { file, source } of viewSources()) {
    for (const pattern of patterns) {
      for (const [, raw] of source.matchAll(pattern)) {
        if (raw.includes('<%')) continue; // templated: cannot be resolved statically
        if (!raw.startsWith('/') || raw.startsWith('//')) continue; // remote or relative
        const clean = raw.split(/[?#]/)[0];
        if (!links.has(clean)) links.set(clean, []);
        links.get(clean).push(file);
      }
    }
  }

  return links;
}

function statusesFor(paths) {
  const probe = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const paths = ${JSON.stringify(paths)};
    const server = createApp().listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      const out = {};
      for (const p of paths) {
        const res = await fetch(base + p, { redirect: 'manual' });
        out[p] = res.status;
      }
      process.stdout.write('<<<' + JSON.stringify(out) + '>>>');
      process.exit(0);
    });
  `;

  const result = spawnSync(process.execPath, ['-e', probe], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DEMO_MODE: 'true',
      DATABASE_URL: '',
      SESSION_SECRET: 'link-target-test'
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 60000
  });

  const match = /<<<([\s\S]*?)>>>/.exec(result.stdout || '');
  assert.ok(match, `probe produced no payload. stdout: ${(result.stdout || '').slice(0, 300)}`);
  return JSON.parse(match[1]);
}

test('the views contain internal links to check', () => {
  const links = [...staticLinks().keys()];
  assert.ok(links.length >= 8, `expected 8+ static internal links, found ${links.length}: ${links.join(', ')}`);
  assert.ok(links.includes('/auth/login'), 'the navbar login link should be among them');
});

test('no internal link leads to a 404', () => {
  const links = staticLinks();

  // Files under public/ are served by express.static, so they need no probe.
  const toProbe = [...links.keys()].filter((link) => !fs.existsSync(path.join(PUBLIC_DIR, link)));
  const statuses = statusesFor(toProbe);

  const broken = toProbe
    .filter((link) => statuses[link] === 404)
    .map((link) => `${link} (in ${[...new Set(links.get(link))].join(', ')})`);

  assert.deepEqual(broken, [], `broken internal link(s): ${broken.join(' | ')}`);
});

test('the probe can tell a real link from a broken one', () => {
  // Control: without it, "no 404s" could just mean the probe never sees one.
  const statuses = statusesFor(['/play', '/auth/login', '/login', '/definitely-not-a-route']);

  assert.notEqual(statuses['/play'], 404, 'a real route must not look missing');
  assert.notEqual(statuses['/auth/login'], 404, 'a real route must not look missing');
  assert.equal(statuses['/login'], 404, '/login is the broken link this test exists to catch');
  assert.equal(statuses['/definitely-not-a-route'], 404);
});
