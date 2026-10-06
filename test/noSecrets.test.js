const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// No credentials in tracked files.
//
// This repository is public. Two separate leaks were found in it:
//
//   - a committed .env holding the live database connection string, and
//   - scripts/generateAiImages.py, which hardcoded a credentialed connection
//     string to the same cluster.
//
// The second survived the clean-up of the first because nothing looked for it.
// Anything committed here is world-readable and stays in history forever, so
// the only safe place for a credential is the environment.
//
// This reports file:line only. It never prints a matched value.

const ROOT = path.join(__dirname, '..');

// scheme://user:password@host
const CREDENTIALED_URI = /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp):\/\/[^:/\s<>'"`]+:[^@\s<>'"`]+@([^/?\s<>'"`]+)/g;

// Hosts that are obviously not real: local databases and documentation fakes.
const HARMLESS_HOST = /^(localhost|127\.0\.0\.1|cluster0\.abc\.mongodb\.net|(.+\.)?example\.(com|org|net))(:\d+)?$/i;

function credentialedUris(text) {
  const found = [];
  for (const match of text.matchAll(CREDENTIALED_URI)) {
    if (!HARMLESS_HOST.test(match[1])) {
      found.push(match.index);
    }
  }
  return found;
}

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\0')
      .filter(Boolean);
  } catch {
    return null; // not a git checkout (e.g. a source tarball)
  }
}

// Built by concatenation so this file does not itself contain a literal
// credentialed URI - the scan below would (rightly) flag it.
const uri = (scheme, user, pass, host) => `${scheme}://` + user + ':' + pass + '@' + host;

test('the detector recognises a credentialed connection string', () => {
  // Control: without it the scan below could pass simply because the pattern
  // never matches anything.
  assert.equal(credentialedUris(`MONGO_URI = "${uri('mongodb+srv', 'someone', 'hunter2', 'cluster0.real.mongodb.net/db')}"`).length, 1);
  assert.equal(credentialedUris(uri('postgres', 'app', 'pw', 'db.internal.example.io/app')).length, 1);
});

test('the detector ignores placeholders and local databases', () => {
  assert.equal(credentialedUris(uri('mongodb+srv', '<user>', '<password>', 'cluster0.real.mongodb.net/db')).length, 0);
  assert.equal(credentialedUris(uri('mongodb', 'root', 'pw', '127.0.0.1:27017/test')).length, 0);
  assert.equal(credentialedUris(uri('mongodb+srv', 'admin', 'pw', 'cluster0.abc.mongodb.net/db')).length, 0);
  assert.equal(credentialedUris('mongodb+srv://cluster0.real.mongodb.net/db').length, 0);
});

test('no tracked file contains a credentialed connection string', (t) => {
  const files = trackedFiles();
  if (!files) {
    t.skip('not a git checkout');
    return;
  }

  const offenders = [];
  for (const file of files) {
    if (file === 'package-lock.json') continue;

    const full = path.join(ROOT, file);
    let buffer;
    try {
      buffer = fs.readFileSync(full);
    } catch {
      continue; // deleted in the working tree but not yet committed
    }
    if (buffer.length > 1024 * 1024 || buffer.includes(0)) continue; // large or binary

    const text = buffer.toString('utf8');
    for (const index of credentialedUris(text)) {
      const line = text.slice(0, index).split('\n').length;
      offenders.push(`${file}:${line}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `credentialed connection string(s) found at: ${offenders.join(', ')}. ` +
      'Read it from the environment instead, and rotate the credential - it is now in git history.'
  );
});

test('no .env file is tracked (only .env.example)', (t) => {
  const files = trackedFiles();
  if (!files) {
    t.skip('not a git checkout');
    return;
  }

  const tracked = files.filter((file) => /(^|\/)\.env($|\.)/.test(file) && !/\.env\.example$/.test(file));
  assert.deepEqual(tracked, [], `env file(s) tracked by git: ${tracked.join(', ')}`);
});
