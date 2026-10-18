const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// The Node version a deploy runs must be one that CI tests.
//
// Render picks a Node version from, in order: a NODE_VERSION variable, a
// .node-version file, an .nvmrc, then package.json "engines". Here "engines" is
// ">=18.18.0", which has no upper bound, and Render resolves an unbounded range
// to the newest Node release: 26 when this was written. A new major arrives
// every April and October with no commit in this repository, so the first sign
// of a release that breaks the app would be a failed deploy.
//
// .node-version pins a major, and Render takes the newest patch release of it,
// so security fixes still arrive and a new major does not. This test keeps the
// pin honest:
//
//   - it has to be a plain number, because an alias such as "lts" moves too;
//   - its major has to be one the CI matrix runs the tests on;
//   - CI's oldest version has to be the floor package.json declares;
//   - render.yaml must not set a NODE_VERSION that disagrees with it, because
//     the variable outranks the file and would silently win.
//
// To move the deploy to another Node line: add the line to the matrix in
// .github/workflows/ci.yml, wait for it to pass, then change .node-version.

const ROOT = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

// "24", "24.21" or "24.21.0". Not "lts", ">=24", "24.x" or "v24".
function parseVersion(text) {
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(String(text).trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2] || 0), patch: Number(match[3] || 0) };
}

function compare(a, b) {
  return (a.major - b.major) || (a.minor - b.minor) || (a.patch - b.patch);
}

const show = (v) => [v.major, v.minor, v.patch].join('.');

// The versions on the workflow's `node: ['18.18', '22', ...]` matrix line.
function matrixVersions(workflow) {
  const line = /^\s*node:\s*\[([^\]]*)\]/m.exec(workflow);
  if (!line) return [];
  return line[1]
    .split(',')
    .map((entry) => parseVersion(entry.trim().replace(/^['"]|['"]$/g, '')))
    .filter(Boolean);
}

// The lower limit of an engines range: ">=18.18.0", with or without "<27" after it.
function floorOf(range) {
  const match = /^>=\s*(\d+\.\d+\.\d+)(?:\s+<\s*\d+(?:\.\d+){0,2})?$/.exec(String(range).trim());
  return match ? parseVersion(match[1]) : null;
}

// What render.yaml says about NODE_VERSION: nothing, or a value (which may be missing).
function renderVariable(yaml) {
  if (!/^\s*-\s*key:\s*NODE_VERSION\s*$/m.test(yaml)) return { set: false };
  const value = /-\s*key:\s*NODE_VERSION\s+value:\s*["']?([^\s"'#]+)/.exec(yaml);
  return { set: true, value: value ? value[1] : null };
}

function ciMatrix() {
  const versions = matrixVersions(read('.github', 'workflows', 'ci.yml'));
  assert.ok(versions.length >= 2, 'could not read the Node versions from the matrix line in .github/workflows/ci.yml');
  return versions;
}

test('the readers understand plain versions, matrix lines, engines ranges and render.yaml', () => {
  // Controls: without them the checks below could pass because a reader found
  // nothing at all.
  assert.deepEqual(parseVersion('24'), { major: 24, minor: 0, patch: 0 });
  assert.deepEqual(parseVersion(' 24.21.0\r\n'), { major: 24, minor: 21, patch: 0 });
  for (const moving of ['lts', 'latest', '>=24', '24.x', '^24.1.0', 'v24', '', '24\n25']) {
    assert.equal(parseVersion(moving), null, JSON.stringify(moving));
  }
  assert.ok(compare(parseVersion('18.17.1'), parseVersion('18.18.0')) < 0);
  assert.ok(compare(parseVersion('24'), parseVersion('18.18.0')) > 0);
  assert.equal(compare(parseVersion('18.18'), parseVersion('18.18.0')), 0);

  assert.deepEqual(
    matrixVersions('        node: [\'18.18\', "22", 24]\n'),
    [parseVersion('18.18'), parseVersion('22'), parseVersion('24')]
  );
  assert.deepEqual(matrixVersions('node-version: ${{ matrix.node }}\n'), []);

  assert.deepEqual(floorOf('>=18.18.0'), parseVersion('18.18.0'));
  assert.deepEqual(floorOf('>=18.18.0 <27'), parseVersion('18.18.0'));
  assert.equal(floorOf('^18.18.0'), null);

  assert.deepEqual(renderVariable('envVars:\n  - key: NODE_ENV\n    value: production\n'), { set: false });
  assert.deepEqual(renderVariable('  # NODE_VERSION is not set here\n'), { set: false });
  assert.deepEqual(renderVariable('  - key: NODE_VERSION\n    value: "22"\n'), { set: true, value: '22' });
  assert.deepEqual(renderVariable('  - key: NODE_VERSION\r\n    value: 22\r\n'), { set: true, value: '22' });
  assert.deepEqual(renderVariable('  - key: NODE_VERSION\n    sync: false\n'), { set: true, value: null });
});

test('.node-version holds one plain Node version', () => {
  const text = read('.node-version');
  assert.ok(
    parseVersion(text),
    `.node-version must hold one plain number such as 24, not ${JSON.stringify(text.trim())}: an alias or a range moves on its own`
  );
});

test('the Node version a deploy pins is one CI runs the tests on', () => {
  const pin = parseVersion(read('.node-version'));
  assert.ok(pin, '.node-version does not hold a plain version');
  const majors = [...new Set(ciMatrix().map((v) => v.major))];
  assert.ok(
    majors.includes(pin.major),
    `.node-version pins Node ${pin.major}, but CI only tests ${majors.join(', ')}. Add ${pin.major} to the matrix first.`
  );
});

test('CI runs the oldest Node version that package.json allows', () => {
  const { engines } = JSON.parse(read('package.json'));
  const floor = floorOf(engines && engines.node);
  assert.ok(floor, `could not read a lower limit from engines.node (${JSON.stringify(engines)})`);
  const oldest = ciMatrix().reduce((a, b) => (compare(a, b) <= 0 ? a : b));
  assert.equal(
    compare(oldest, floor),
    0,
    `CI's oldest Node is ${show(oldest)}, but package.json allows ${engines.node}: either the floor goes untested or CI tests a version nobody supports`
  );
});

test('render.yaml does not set a NODE_VERSION that overrides the pin', () => {
  const variable = renderVariable(read('render.yaml'));
  if (!variable.set) return;
  const pin = parseVersion(read('.node-version'));
  assert.ok(pin, '.node-version does not hold a plain version');
  const set = variable.value && parseVersion(variable.value);
  assert.ok(set, 'render.yaml names NODE_VERSION without a plain value');
  assert.equal(
    compare(set, pin),
    0,
    `render.yaml sets NODE_VERSION ${variable.value} but .node-version says ${show(pin)}. The variable wins, so the file would be ignored.`
  );
});
