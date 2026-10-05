const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Structural guard on what the views load.
//
// This exists because adding a Content-Security-Policy silently broke pages:
// script-src allows 'self' and cdn.jsdelivr.net, but views were pulling scripts
// from code.jquery.com, cdnjs.cloudflare.com and stackpath.bootstrapcdn.com,
// plus an inline <script> block. Nothing failed a test or a smoke check,
// because the smoke tests only ever hit /play and the error paths.
//
// It also catches a view referencing a local script that does not exist -
// challenges.ejs pointed at /js/jquery.min.js, which was never in the repo.

const ROOT = path.join(__dirname, '..');
const VIEWS = path.join(ROOT, 'views');
const PUBLIC = path.join(ROOT, 'public');

// Must match the directives in server.js.
const ALLOWED_SCRIPT_HOSTS = ['cdn.jsdelivr.net'];
const ALLOWED_STYLE_HOSTS = ['cdn.jsdelivr.net'];

function viewFiles() {
  return fs
    .readdirSync(VIEWS, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith('.ejs'));
}

function readView(file) {
  const source = fs.readFileSync(path.join(VIEWS, file), 'utf8');
  // Strip EJS comments (<%# ... %>) and HTML comments. Neither reaches the
  // browser, so neither should trip these checks - otherwise a comment
  // explaining why jQuery was removed counts as a jQuery reference.
  return source.replace(/<%#[\s\S]*?%>/g, '').replace(/<!--[\s\S]*?-->/g, '');
}

function srcAttributes(source, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}\\s*=\\s*["']([^"']+)["']`, 'gi');
  return [...source.matchAll(re)].map((m) => m[1]);
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

test('every local script a view loads exists on disk', () => {
  const missing = [];

  for (const file of viewFiles()) {
    for (const src of srcAttributes(readView(file), 'script', 'src')) {
      if (hostOf(src)) continue; // remote, checked separately
      if (!src.startsWith('/')) continue; // relative/templated, skip
      if (!fs.existsSync(path.join(PUBLIC, src))) {
        missing.push(`${file} -> ${src}`);
      }
    }
  }

  assert.deepEqual(missing, [], `view(s) reference non-existent script(s): ${missing.join(', ')}`);
});

test('every remote script host is on the CSP allowlist', () => {
  const blocked = [];

  for (const file of viewFiles()) {
    for (const src of srcAttributes(readView(file), 'script', 'src')) {
      const host = hostOf(src);
      if (host && !ALLOWED_SCRIPT_HOSTS.includes(host)) {
        blocked.push(`${file} -> ${host}`);
      }
    }
  }

  assert.deepEqual(
    blocked,
    [],
    `script host(s) blocked by CSP script-src: ${blocked.join(', ')}. ` +
      'Either serve the file locally or add the host to the CSP in server.js.'
  );
});

test('every remote stylesheet host is on the CSP allowlist', () => {
  const blocked = [];

  for (const file of viewFiles()) {
    for (const href of srcAttributes(readView(file), 'link', 'href')) {
      const host = hostOf(href);
      if (host && !ALLOWED_STYLE_HOSTS.includes(host)) {
        blocked.push(`${file} -> ${host}`);
      }
    }
  }

  assert.deepEqual(blocked, [], `style host(s) blocked by CSP style-src: ${blocked.join(', ')}`);
});

test('no view uses an inline script block', () => {
  // script-src has no 'unsafe-inline', so an inline block never executes.
  const offenders = [];

  for (const file of viewFiles()) {
    const source = readView(file);
    // <script> with no src attribute before the closing bracket.
    const inline = [...source.matchAll(/<script\b([^>]*)>/gi)].filter(
      ([, attrs]) => !/\bsrc\s*=/.test(attrs)
    );
    if (inline.length) offenders.push(`${file} (${inline.length})`);
  }

  assert.deepEqual(
    offenders,
    [],
    `inline <script> blocked by CSP in: ${offenders.join(', ')}. Move it to a file under public/js.`
  );
});

test('no view uses an inline style block or style attribute', () => {
  // style-src is 'self' with no 'unsafe-inline', so neither applies. A <style>
  // block in teddies.ejs and style="" attributes in _debugLinks.ejs were both
  // silently dead.
  const offenders = [];

  for (const file of viewFiles()) {
    const source = readView(file);
    if (/<style\b/i.test(source)) offenders.push(`${file} (<style> block)`);
    if (/\sstyle\s*=\s*["']/i.test(source)) offenders.push(`${file} (style attribute)`);
  }

  assert.deepEqual(
    offenders,
    [],
    `inline CSS blocked by CSP style-src: ${offenders.join(', ')}. Move it to public/css.`
  );
});

test('no view uses an inline event handler attribute', () => {
  // script-src has no 'unsafe-inline', which also blocks onclick/onerror/etc.
  // teddies.ejs relied on an inline onerror for its image fallback.
  const offenders = [];

  for (const file of viewFiles()) {
    const matches = [...readView(file).matchAll(/\son[a-z]+\s*=\s*["']/gi)].map((m) => m[0].trim());
    if (matches.length) offenders.push(`${file}: ${matches.join(' ')}`);
  }

  assert.deepEqual(
    offenders,
    [],
    `inline event handler(s) blocked by CSP: ${offenders.join(' | ')}. Attach them from a script file.`
  );
});

test('no view relies on jQuery', () => {
  // jQuery is not a dependency and is not served anywhere. Two scripts used it
  // and silently threw "$ is not defined".
  const offenders = [];

  for (const file of viewFiles()) {
    if (/jquery/i.test(readView(file))) offenders.push(file);
  }

  const clientScripts = fs
    .readdirSync(path.join(PUBLIC, 'js'))
    .filter((f) => f.endsWith('.js'))
    .filter((f) => {
      // Strip comments first: a note explaining why jQuery was removed is not
      // a jQuery dependency.
      const src = fs
        .readFileSync(path.join(PUBLIC, 'js', f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      return /\$\(document\)|\$\.ajax|\bjQuery\b/.test(src);
    });

  assert.deepEqual(offenders, [], `view(s) referencing jQuery: ${offenders.join(', ')}`);
  assert.deepEqual(clientScripts, [], `script(s) using jQuery: ${clientScripts.join(', ')}`);
});
