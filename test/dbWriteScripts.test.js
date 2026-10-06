const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

// Every script that writes to the database must stop and ask first.
//
// These scripts read DATABASE_URL from .env, and that .env points at the live
// cluster, so a stray `node fixDatabase.js` used to rewrite production records
// with no prompt. utils/scriptGuard.js is the gate. Six scripts were wired to
// it by hand - and two more writers (scripts/linkPlayersToUsers.js and
// scripts/dalleImageGenerator.js) were missed, because nothing looked for them.
//
// So this finds the writers instead of trusting a list: any script that both
// connects to a database and calls a write method must refuse to run without
// --yes. Each is actually executed, so being "wired to" the guard in name only
// does not pass.

const ROOT = path.join(__dirname, '..');

// Application code, not scripts: these connect and write as part of serving
// requests.
const NOT_SCRIPTS = new Set(['server.js', 'gameLogic.js']);

const CONNECTS = /mongoose\.connect|MongoClient/;
const WRITES =
  /\.save\(|insertMany|insertOne|updateMany|updateOne|replaceOne|deleteMany|deleteOne|bulkWrite|\.create\(|findByIdAndUpdate|findOneAndUpdate|\.drop\(/;

// Unreachable on purpose: the guard has to stop a script before any connection
// attempt, so this never needs to resolve.
const UNREACHABLE_DB = 'mongodb://127.0.0.1:1/guardtest';

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\0')
      .filter(Boolean);
  } catch {
    return null;
  }
}

function writeScripts(files) {
  return files
    .filter((file) => file.endsWith('.js'))
    .filter((file) => !file.includes('/') || file.startsWith('scripts/'))
    .filter((file) => !NOT_SCRIPTS.has(file))
    .filter((file) => {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      return CONNECTS.test(source) && WRITES.test(source);
    })
    .sort();
}

// Run a script with no flags and report whether it stopped at the guard.
function runWithoutConfirmation(script, cwd = ROOT) {
  const result = spawnSync(process.execPath, [script], {
    cwd,
    env: { ...process.env, DATABASE_URL: UNREACHABLE_DB, UNSPLASH_ACCESS_KEY: 'test' },
    encoding: 'utf8',
    timeout: 20000
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;

  return {
    output,
    refused: /Refusing to write without confirmation/.test(output),
    leaksCredentials: /:[^:@/\s]+@/.test(output)
  };
}

test('the scan finds the known write scripts', (t) => {
  const files = trackedFiles();
  if (!files) return t.skip('not a git checkout');

  const found = writeScripts(files);

  // Control: if the heuristic stopped matching, the checks below would pass
  // against an empty list.
  for (const known of ['fixDatabase.js', 'populateDatabase.js', 'scripts/seedChallenges.js', 'scripts/linkPlayersToUsers.js']) {
    assert.ok(found.includes(known), `expected ${known} to be recognised as a write script; found: ${found.join(', ')}`);
  }
});

test('the check tells a guarded script from an unguarded one', () => {
  // Control for the test below: it must be able to fail. A script that goes
  // straight to work has to be reported as not refusing, and one that calls the
  // real guard has to be reported as refusing.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbwrite-'));

  try {
    const unguarded = path.join(dir, 'unguarded.js');
    fs.writeFileSync(unguarded, "console.log('connecting and writing');\n");

    const guarded = path.join(dir, 'guarded.js');
    const guardModule = JSON.stringify(path.join(ROOT, 'utils', 'scriptGuard.js'));
    fs.writeFileSync(guarded, `require(${guardModule}).requireWriteConfirmation('guarded.js');\nconsole.log('wrote');\n`);

    assert.equal(runWithoutConfirmation(unguarded, dir).refused, false, 'an unguarded script must be reported');
    assert.equal(runWithoutConfirmation(guarded, dir).refused, true, 'a guarded script must be reported as refusing');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('every script that writes to the database refuses to run without confirmation', (t) => {
  const files = trackedFiles();
  if (!files) return t.skip('not a git checkout');

  const unguarded = [];

  for (const script of writeScripts(files)) {
    const { refused, leaksCredentials } = runWithoutConfirmation(script);

    if (!refused) unguarded.push(script);
    assert.ok(!leaksCredentials, `${script}: guard output must not contain credentials`);
  }

  assert.deepEqual(
    unguarded,
    [],
    `script(s) that write to the database without asking first: ${unguarded.join(', ')}. ` +
      'Call requireWriteConfirmation() from utils/scriptGuard.js before connecting.'
  );
});
