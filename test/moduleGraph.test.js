const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');
const { execFileSync } = require('node:child_process');

// Code that cannot load stays invisible until the day somebody runs it.
//
// scripts/generateSoundEffects.js required `wav` and scripts/dalleImageGenerator.js
// required `node-fetch`. Neither was ever in package.json, so both crashed on a
// clean install, and nothing noticed because nothing ever loaded them. A route
// file is quieter still: server.js loads them through loadRoute(), which turns a
// failed require into a logged 404 by design, so a deleted or misspelled route
// module simply stops existing.
//
// This reads the tracked source and checks that
//   1. every require('package') is a Node built-in or declared in package.json
//   2. every relative require points at a file git tracks
//   3. every loadRoute('./path') in server.js points at a file git tracks
//   4. every tracked .js file parses
//
// "Tracked" is the point of 2 and 3: a file that exists only on your disk (an
// ignored or never-added file) would satisfy fs.existsSync here and then be
// missing from every clone and deploy.

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const declared = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);
const builtins = new Set(Module.builtinModules);

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\0')
      .filter(Boolean);
  } catch {
    return null;
  }
}

// Comments mention modules too ("require('bcrypt') failed on Linux"), and those
// must not count. The lookbehind-style guard keeps the // in https:// intact.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

function matches(source, pattern) {
  const code = stripComments(source);
  const found = [];
  let match;
  while ((match = pattern.exec(code))) found.push(match[2]);
  return found;
}

const requiredSpecifiers = (source) => matches(source, /\brequire\(\s*(['"])([^'"\n]+)\1\s*\)/g);
const loadRouteTargets = (source) => matches(source, /\bloadRoute\(\s*(['"])(\.[^'"\n]+)\1/g);

function packageName(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function undeclaredPackages(source) {
  return requiredSpecifiers(source)
    .filter((spec) => !spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('node:'))
    .map(packageName)
    .filter((name) => !builtins.has(name) && !declared.has(name));
}

function resolves(base, tracked) {
  return ['', '.js', '.json', '.cjs', '/index.js', '/index.json'].some((suffix) => tracked.has(base + suffix));
}

function unresolved(specs, fromFile, tracked) {
  const dir = path.posix.dirname(fromFile);
  return specs.filter((spec) => !resolves(path.posix.normalize(path.posix.join(dir, spec)), tracked));
}

const unresolvedRelative = (source, fromFile, tracked) =>
  unresolved(requiredSpecifiers(source).filter((spec) => spec.startsWith('.')), fromFile, tracked);

// Compile only, never run. Server code gets the CommonJS wrapper (top-level
// `return` is legal there); browser scripts under public/ are plain scripts.
function syntaxError(source, file, { browser = false } = {}) {
  const body = source.replace(/^#!.*/, '');
  try {
    new vm.Script(browser ? body : Module.wrap(body), { filename: file });
    return null;
  } catch (error) {
    return error.message;
  }
}

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// This file's own control cases contain deliberately bad require() calls inside
// strings, so the scans below must not read it as source.
const SELF = 'test/moduleGraph.test.js';

test('the checks flag what they are meant to flag', () => {
  // Control: without this, a regex that stopped matching would turn every test
  // below into a pass against nothing.
  assert.deepEqual(undeclaredPackages("const a = require('left-pad');"), ['left-pad']);
  assert.deepEqual(undeclaredPackages("require('@scope/pkg/deep/file');"), ['@scope/pkg']);
  assert.deepEqual(undeclaredPackages("require('express'); require('mongoose/lib/x'); require('node:fs'); require('fs');"), []);
  assert.deepEqual(undeclaredPackages("// require('wav')\n/* require('nope') */\nconst x = 1;"), [], 'comments do not count');
  assert.deepEqual(undeclaredPackages("const url = 'https://x.test'; require('left-pad');"), ['left-pad'], 'a URL must not hide what follows it');

  const tracked = new Set(['utils/scriptGuard.js', 'routes/index.js', 'data/teddies.json']);
  assert.deepEqual(unresolvedRelative("require('./missing'); require('../utils/scriptGuard');", 'scripts/x.js', tracked), ['./missing']);
  assert.deepEqual(unresolvedRelative("require('./routes'); require('./data/teddies');", 'server.js', tracked), [], 'directory index and .json resolve');

  assert.deepEqual(loadRouteTargets("loadRoute('./routes/x', 'x');\nfunction loadRoute(modulePath, label) {}"), ['./routes/x']);

  assert.notEqual(syntaxError('const = ;', 'x.js'), null, 'a syntax error must be reported');
  assert.equal(syntaxError('return 1;', 'x.js'), null, 'top-level return is legal in CommonJS');
  assert.notEqual(syntaxError('return 1;', 'x.js', { browser: true }), null, 'but not in a browser script');
  assert.equal(syntaxError('#!/usr/bin/env node\nconsole.log(1);', 'x.js'), null, 'a shebang is fine');
});

test('every package a tracked file requires is a built-in or declared in package.json', (t) => {
  const files = trackedFiles();
  if (!files) return t.skip('not a git checkout');

  const sources = files.filter((file) => file.endsWith('.js') && !file.startsWith('public/') && file !== SELF);
  assert.ok(sources.length > 30, `only found ${sources.length} source files; the scan is not seeing the repo`);

  const problems = [];
  for (const file of sources) {
    for (const name of new Set(undeclaredPackages(read(file)))) problems.push(`${file} requires '${name}'`);
  }

  assert.deepEqual(problems, [], `not declared in package.json (a clean install would crash):\n  ${problems.join('\n  ')}`);
});

test('every relative require points at a file git tracks', (t) => {
  const files = trackedFiles();
  if (!files) return t.skip('not a git checkout');

  const tracked = new Set(files);
  const problems = [];

  // test/ and tests/ build probe scripts out of template strings, so a relative
  // path in there is not always relative to the file it appears in. Anything
  // they genuinely require fails when they run.
  const sources = files.filter((file) => file.endsWith('.js') && !file.startsWith('public/') && !/^tests?\//.test(file));

  for (const file of sources) {
    for (const spec of unresolvedRelative(read(file), file, tracked)) problems.push(`${file} requires '${spec}'`);
  }

  assert.deepEqual(problems, [], `no tracked file at that path:\n  ${problems.join('\n  ')}`);
});

test('every route module server.js loads exists', (t) => {
  const files = trackedFiles();
  if (!files) return t.skip('not a git checkout');

  const targets = loadRouteTargets(read('server.js'));
  assert.ok(targets.includes('./routes/gameRoutes'), `loadRoute() calls found: ${targets.join(', ')}; the scan is not seeing server.js`);

  // loadRoute() logs and returns null when a require fails, so the symptom of a
  // missing file is a 404, not a crash.
  const missing = unresolved(targets, 'server.js', new Set(files));
  assert.deepEqual(missing, [], `loadRoute() targets with no tracked file (these routes would silently 404):\n  ${missing.join('\n  ')}`);
});

test('every tracked .js file parses', (t) => {
  const files = trackedFiles();
  if (!files) return t.skip('not a git checkout');

  const problems = [];
  for (const file of files.filter((name) => name.endsWith('.js'))) {
    const message = syntaxError(read(file), file, { browser: file.startsWith('public/') });
    if (message) problems.push(`${file}: ${message}`);
  }

  assert.deepEqual(problems, [], `syntax errors:\n  ${problems.join('\n  ')}`);
});
