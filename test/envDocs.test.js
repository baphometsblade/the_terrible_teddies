const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Every setting the code reads is written down, and every setting written down
// is read.
//
// scripts/dalleImageGenerator.js needs UNSPLASH_ACCESS_KEY, and neither the
// README nor .env.example said so: the first anyone learned of it was the
// script stopping with "not set". A setting nobody can find out about is a
// setting nobody can set. The opposite drift is as bad. Documentation for a
// variable the code stopped reading sends people to change something that does
// nothing.
//
// Two checks, both on tracked files so the answer does not depend on what
// happens to be lying around:
//
//   - every environment variable that code outside test/ and tests/ reads
//     appears in README.md or .env.example;
//   - every variable .env.example sets, or shows commented out, is read
//     somewhere, tests included.
//
// It sees direct reads only: process.env.NAME, process.env['NAME'],
// `const { NAME } = process.env`, and the Python equivalents. A variable read
// through another name (`const env = process.env; env.NAME`) is not seen, and
// only names in capitals are, which is how every setting here is written. The
// control cases below pin what is seen.

const ROOT = path.join(__dirname, '..');

function readIfPresent(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
  } catch {
    return ''; // tracked, but deleted from the working tree
  }
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

const NAME = '[A-Z][A-Z0-9_]*';

// The names of the environment variables a source file reads.
function envNames(text) {
  const names = new Set();

  // process.env.NAME and process.env['NAME']
  const direct = new RegExp(`process\\.env(?:\\.(${NAME})\\b|\\[\\s*['"](${NAME})['"]\\s*\\])`, 'g');
  for (const match of text.matchAll(direct)) names.add(match[1] || match[2]);

  // const { NAME, OTHER = 1, THIRD: alias } = process.env
  for (const match of text.matchAll(/\{([^{}]*)\}\s*=\s*process\.env\b/g)) {
    for (const part of match[1].split(',')) {
      const name = new RegExp(`^\\s*(${NAME})\\b`).exec(part);
      if (name) names.add(name[1]);
    }
  }

  // Python: os.environ.get('NAME'), os.getenv('NAME'), os.environ['NAME']
  const python = new RegExp(
    `os\\.(?:environ\\.get|getenv)\\(\\s*['"](${NAME})['"]|os\\.environ\\[\\s*['"](${NAME})['"]\\s*\\]`,
    'g'
  );
  for (const match of text.matchAll(python)) names.add(match[1] || match[2]);

  return names;
}

// Whole-name match: DATABASE_URL is not mentioned by "TEST_DATABASE_URL".
function mentions(docs, name) {
  return new RegExp(`\\b${name}\\b`).test(docs);
}

// The NAME= lines of an env file, live or commented out ("# NAME=value").
function exampleSettings(text) {
  const names = new Set();
  for (const match of text.matchAll(new RegExp(`^[ \\t]*#?[ \\t]*(${NAME})=`, 'gm'))) names.add(match[1]);
  return names;
}

// Code that configures the app, as opposed to code that tests it.
const isSettingsCode = (file) => /\.(?:js|cjs|mjs|py)$/.test(file) && !/^(?:test|tests|public|node_modules)\//.test(file);
const isCode = (file) => /\.(?:js|cjs|mjs|py)$/.test(file) && !/^(?:public|node_modules)\//.test(file);

test('the readers find direct, destructured and Python reads, and nothing else', () => {
  // Controls: without them the checks below could pass because a reader found
  // nothing at all.
  const js = `
    const a = process.env.ALPHA;
    const b = process.env['BRAVO'] || process.env["CHARLIE"];
    const { DELTA, ECHO = 'x', FOXTROT: golf } = process.env;
    process.env.HOTEL = 'set';
  `;
  assert.deepEqual([...envNames(js)].sort(), ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'HOTEL']);

  const python = 'x = os.environ.get("INDIA")\ny = os.getenv(\'JULIET\', \'d\')\nz = os.environ["KILO"]\n';
  assert.deepEqual([...envNames(python)].sort(), ['INDIA', 'JULIET', 'KILO']);

  const notReads = 'process.environment.LIMA; other.env.MIKE; process.env.npm_lifecycle_event; process.env;';
  assert.deepEqual([...envNames(notReads)], []);

  assert.ok(mentions('set DATABASE_URL first', 'DATABASE_URL'));
  assert.ok(!mentions('set TEST_DATABASE_URL first', 'DATABASE_URL'), 'a longer name is not a mention of a shorter one');
  assert.ok(!mentions('DATABASE_URLS', 'DATABASE_URL'));

  const example = '# prose\nPORT=3000\n# DB_TIMEOUT_MS=10000\n#   node -e "x"\n  SESSION_SECRET=abc\n# Set FOO=bar in prose\n';
  assert.deepEqual([...exampleSettings(example)].sort(), ['DB_TIMEOUT_MS', 'PORT', 'SESSION_SECRET']);
});

test('every environment variable the code reads is described in README.md or .env.example', (t) => {
  const files = trackedFiles();
  if (!files) return t.skip('not a git checkout');

  const docs = `${readIfPresent('README.md')}\n${readIfPresent('.env.example')}`;
  const found = new Set();
  const undocumented = [];
  for (const file of files.filter(isSettingsCode)) {
    for (const name of envNames(readIfPresent(file))) {
      found.add(name);
      if (!mentions(docs, name)) undocumented.push(`${name} (read in ${file})`);
    }
  }

  // Control: a scan that finds nothing proves nothing.
  for (const known of ['DATABASE_URL', 'SESSION_SECRET', 'PORT', 'NODE_ENV', 'DEMO_MODE']) {
    assert.ok(found.has(known), `the scan should find ${known}; has it stopped looking?`);
  }

  assert.deepEqual(
    undocumented,
    [],
    `Read by the code but described in neither README.md nor .env.example: ${undocumented.join(', ')}. ` +
    'Add each to .env.example (commented out if it has a default) and say what it does.'
  );
});

test('every setting .env.example shows is read by something', (t) => {
  const files = trackedFiles();
  if (!files) return t.skip('not a git checkout');

  const read = new Set();
  for (const file of files.filter(isCode)) {
    for (const name of envNames(readIfPresent(file))) read.add(name);
  }

  const shown = exampleSettings(readIfPresent('.env.example'));
  assert.ok(shown.size >= 5, `read only ${shown.size} settings from .env.example; has its layout changed?`);

  const unused = [...shown].filter((name) => !read.has(name));
  assert.deepEqual(
    unused,
    [],
    `.env.example describes settings that nothing reads: ${unused.join(', ')}. ` +
    'Remove them, or restore the code that read them.'
  );
});
