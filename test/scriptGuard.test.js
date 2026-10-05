const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { describeTarget, isDryRun, isConfirmed } = require('../utils/scriptGuard');

// The seed and repair scripts used to connect to DATABASE_URL and start writing
// the instant they were invoked. That .env points at the live cluster, so a
// stray `node fixDatabase.js` rewrote production records with no confirmation
// and no way to preview.

test('describeTarget never exposes credentials', () => {
  const masked = describeTarget('mongodb+srv://admin:sup3rs3cret@cluster0.abc.mongodb.net/Prod?retryWrites=true');

  assert.ok(!masked.includes('sup3rs3cret'), `password leaked: ${masked}`);
  assert.ok(!masked.includes('admin'), `username leaked: ${masked}`);
  assert.ok(masked.includes('cluster0.abc.mongodb.net'), 'host should be shown');
  assert.ok(masked.includes('Prod'), 'database name should be shown');
});

test('describeTarget handles missing and malformed values', () => {
  assert.match(describeTarget(undefined), /not set/i);
  assert.match(describeTarget(''), /not set/i);
  assert.match(describeTarget('not-a-url'), /unparseable/i);
});

test('isDryRun recognises the documented flags', () => {
  for (const flag of ['--dry-run', '--dryrun', '-n']) {
    assert.equal(isDryRun(['node', 'x.js', flag]), true, `${flag} should mean dry run`);
  }
  assert.equal(isDryRun(['node', 'x.js']), false);
  assert.equal(isDryRun(['node', 'x.js', '--yes']), false);
});

test('isConfirmed requires an explicit flag', () => {
  assert.equal(isConfirmed(['node', 'x.js', '--yes']), true);
  assert.equal(isConfirmed(['node', 'x.js', '-y']), true);
  assert.equal(isConfirmed(['node', 'x.js']), false);
  assert.equal(isConfirmed(['node', 'x.js', '--dry-run']), false);
});

// Each write script must actually be wired to the guard, not just have it
// available. Running with no flags must refuse and write nothing.
const WRITE_SCRIPTS = [
  'fixDatabase.js',
  'populateDatabase.js',
  'populateItems.js',
  'scripts/seedChallenges.js',
  'scripts/seedEventsAndBosses.js',
  'scripts/populateCustomItems.js'
];

for (const script of WRITE_SCRIPTS) {
  test(`${script} refuses to write without confirmation`, () => {
    const result = spawnSync(process.execPath, [script], {
      cwd: path.join(__dirname, '..'),
      // A URL that would fail to connect anyway - the guard must stop it before
      // any connection attempt.
      env: { ...process.env, DATABASE_URL: 'mongodb://127.0.0.1:1/guardtest' },
      encoding: 'utf8',
      timeout: 20000
    });

    const output = `${result.stdout || ''}${result.stderr || ''}`;

    assert.match(
      output,
      /Refusing to write without confirmation/,
      `${script} did not stop at the guard. Output: ${output.slice(0, 300)}`
    );
    assert.ok(!/sup3rs3cret|:[^:@/]+@/.test(output), 'guard output must not contain credentials');
  });
}
