const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Every form action in a view must hit a real route.
//
// views/teddies.ejs posted to /battle, which no router defines, so "Initiate
// Battle" 404'd. Nothing caught it because no test ever submitted the form.
//
// A 401 counts as passing: the route exists and is simply auth-protected, which
// is what we want to distinguish from "no such route".

const SERVER = path.join(__dirname, '..', 'server.js');
const VIEWS = path.join(__dirname, '..', 'views');

function formActions() {
  const actions = new Set();

  for (const file of fs.readdirSync(VIEWS, { recursive: true }).map(String)) {
    if (!file.endsWith('.ejs')) continue;

    const source = fs
      .readFileSync(path.join(VIEWS, file), 'utf8')
      .replace(/<%#[\s\S]*?%>/g, '');

    for (const match of source.matchAll(/<form\b[^>]*\baction\s*=\s*["']([^"']+)["']/gi)) {
      const action = match[1];
      // Skip templated actions - they cannot be resolved statically.
      if (action.includes('<%')) continue;
      if (!action.startsWith('/')) continue;
      actions.add(action);
    }
  }

  return [...actions].sort();
}

function statusesFor(actions) {
  const probe = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const actions = ${JSON.stringify(actions)};
    const server = createApp().listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      const out = {};
      for (const action of actions) {
        const res = await fetch(base + action, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'probe=1',
          redirect: 'manual'
        });
        out[action] = res.status;
      }
      // Delimited: the app's 404 handler console.logs, which would otherwise
      // be interleaved with this payload.
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
      SESSION_SECRET: 'form-action-test'
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });

  const match = /<<<([\s\S]*?)>>>/.exec(result.stdout || '');
  assert.ok(match, `probe produced no payload. stdout: ${(result.stdout || '').slice(0, 300)}`);
  return JSON.parse(match[1]);
}

test('views declare at least one resolvable form action', () => {
  assert.ok(formActions().length > 0, 'expected to find form actions to check');
});

test('no form posts to a route that does not exist', () => {
  const actions = formActions();
  const statuses = statusesFor(actions);

  const missing = actions.filter((action) => statuses[action] === 404);

  assert.deepEqual(
    missing,
    [],
    `form action(s) with no matching route: ${missing
      .map((a) => `${a} -> 404`)
      .join(', ')}. Point the form at a real route or add the handler.`
  );
});

test('the probe can tell an existing route from a missing one', () => {
  // Without this control the test above could pass simply because every
  // request errors the same way.
  //
  // An existing route answers something other than 404 - 401 when only auth
  // stands in the way, or 503 when the database guard fires first (which is
  // what happens in demo mode, where this runs).
  const statuses = statusesFor(['/game/choose-lineup', '/definitely-not-a-route']);

  assert.notEqual(
    statuses['/game/choose-lineup'],
    404,
    `a real route must not look missing (got ${statuses['/game/choose-lineup']})`
  );
  assert.equal(statuses['/definitely-not-a-route'], 404, 'a missing route should 404');
});
