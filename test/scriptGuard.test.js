const test = require('node:test');
const assert = require('node:assert/strict');

const { describeTarget, isDryRun, isConfirmed } = require('../utils/scriptGuard');

// The seed and repair scripts used to connect to DATABASE_URL and start writing
// the instant they were invoked. That .env points at the live cluster, so a
// stray `node fixDatabase.js` rewrote production records with no confirmation
// and no way to preview.

test('describeTarget never exposes credentials', () => {
  // Assembled from parts, on a non-Atlas host. A credentialed connection string
  // written out in full is exactly what secret scanners are built to flag, even
  // when it is obviously fake: GitHub raised three alerts on earlier versions of
  // this fixture and of the one in test/noSecrets.test.js.
  const url = 'mongodb+srv://' + 'admin' + ':' + 'sup3rs3cret' + '@' + 'cluster0.example.org/Prod?retryWrites=true';
  const masked = describeTarget(url);

  assert.ok(!masked.includes('sup3rs3cret'), `password leaked: ${masked}`);
  assert.ok(!masked.includes('admin'), `username leaked: ${masked}`);
  assert.ok(masked.includes('cluster0.example.org'), 'host should be shown');
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

// That every write script is actually wired to the guard is checked in
// dbWriteScripts.test.js, which finds the scripts rather than trusting a list.