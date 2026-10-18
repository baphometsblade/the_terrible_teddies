const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Render has to start the server directly, not through npm.
//
// Render stops an instance by sending SIGTERM to the process its start command
// launched, and server.js shuts down cleanly when it hears it. `npm start` puts
// two processes in between: npm, then `sh -c node server.js`. npm passes the
// signal on, but only as far as that shell, which dies without telling node.
// Measured with npm 10.9.8 on Linux, where sh is dash: SIGTERM to npm ended npm
// and the shell within 200 ms and left node serving, never told. The shutdown
// code never ran. `node server.js` is the same program with nothing in between.
// (How the platform itself launches the command is its own business: dash keeps
// a shell between the caller and node even for `sh -c "node server.js"`, bash
// does not. Render's support advice is the same as this test's: start with node.)
//
// So render.yaml must name node itself, and the file it names must be the one
// package.json's "start" script runs, so the two cannot drift apart. (A service
// set up by hand in Render's dashboard has its own start command; that one
// cannot be checked from here.)

const ROOT = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

// The command on render.yaml's `startCommand:` line, without quotes.
function startCommandOf(yaml) {
  const line = /^\s*startCommand:[ \t]*(.*?)[ \t]*$/m.exec(yaml);
  if (!line) return null;
  return line[1].replace(/^(['"])(.*)\1$/, '$2').trim() || null;
}

// `node server.js`, with optional node flags: node itself and nothing wrapped
// around it, no shell and no package manager. It splits the command into words
// and checks each one. A single pattern with a repeated group for the flags did
// the same job and doubled its work for every extra flag on a command that
// almost matched (CodeQL flagged it, and 26 flags took a second).
function runsNodeDirectly(command) {
  const words = String(command).trim().split(/[ \t]+/);
  if (words.length < 2 || words[0] !== 'node') return false;
  const flags = words.slice(1, -1);
  const file = words[words.length - 1];
  return flags.every((word) => /^-{1,2}[\w=.:][\w=.:-]*$/.test(word)) && /^[\w./-]+\.[cm]?js$/.test(file);
}

test('the readers tell node from a wrapper around node', () => {
  // Controls: without them the checks below could pass because the readers
  // found nothing or accepted everything.
  assert.equal(startCommandOf('    startCommand: npm start\n'), 'npm start');
  assert.equal(startCommandOf('    startCommand: "node server.js"\r\n'), 'node server.js');
  assert.equal(startCommandOf("  startCommand: 'node server.js'  \n"), 'node server.js');
  assert.equal(startCommandOf('services:\n  - type: web\n'), null);
  assert.equal(startCommandOf('    startCommand:\n'), null);

  for (const direct of ['node server.js', 'node ./server.js', 'node --max-old-space-size=400 server.js', 'node dist/main.mjs']) {
    assert.ok(runsNodeDirectly(direct), direct);
  }
  for (const wrapped of [
    'npm start', 'npm run start', 'yarn start', 'pnpm start', 'npx node server.js',
    'sh -c "node server.js"', 'node server.js && echo done', 'node', 'nodemon server.js', ''
  ]) {
    assert.ok(!runsNodeDirectly(wrapped), JSON.stringify(wrapped));
  }

  // The input that made the first version of this reader take ages: a command
  // that almost matches, with many flags. 40 repeats would not finish in this
  // lifetime on that version.
  const started = Date.now();
  assert.ok(!runsNodeDirectly(`node\t-${'--\t-'.repeat(40)}!`));
  assert.ok(Date.now() - started < 1000, 'a long, odd command should be refused at once');
});

test('render.yaml starts node itself, so SIGTERM reaches the server', () => {
  const command = startCommandOf(read('render.yaml'));
  assert.ok(command, 'render.yaml has no startCommand');
  assert.ok(
    runsNodeDirectly(command),
    `render.yaml starts the server with ${JSON.stringify(command)}. Use "node server.js": a package manager or shell in between ` +
    'swallows the SIGTERM Render sends, and the server never gets to shut down cleanly.'
  );
});

test("render.yaml starts the file package.json's start script starts", () => {
  const command = startCommandOf(read('render.yaml'));
  const { scripts } = JSON.parse(read('package.json'));
  assert.ok(scripts && scripts.start, 'package.json has no start script');
  assert.equal(
    command,
    scripts.start.trim(),
    `render.yaml runs ${JSON.stringify(command)} but "npm start" runs ${JSON.stringify(scripts.start)}. Keep them the same.`
  );
});
