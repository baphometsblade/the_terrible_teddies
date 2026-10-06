const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

// Every view must compile, and must not emit unescaped values.
//
// Three views (endGame, feedbackDashboard, arenaGUI) used EJS 2's
// `<% include partial %>` directive, which EJS 3 removed. They could not
// compile, so rendering any of them would have thrown. Nothing noticed: the
// first two were never rendered, and the third sat behind a route that no test
// reached.
//
// And EJS only escapes `<%= %>`. `<%- %>` writes raw HTML, so every use of it is
// a potential XSS sink. Includes are the one legitimate use.

const VIEWS = path.join(__dirname, '..', 'views');

function viewFiles() {
  return fs
    .readdirSync(VIEWS, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.ejs'))
    .sort();
}

test('the compile check can tell a broken view from a good one', () => {
  // Control: without it, "everything compiles" could mean "compile never throws".
  assert.throws(() => ejs.compile('<% include partials/_head.ejs %>'), 'EJS 2 include syntax must fail');
  assert.doesNotThrow(() => ejs.compile("<%- include('partials/_head.ejs') %>"));
});

test('every view and partial compiles', () => {
  const failures = [];

  for (const file of viewFiles()) {
    const full = path.join(VIEWS, file);
    try {
      ejs.compile(fs.readFileSync(full, 'utf8'), { filename: full });
    } catch (error) {
      failures.push(`${file}: ${String(error.message).split('\n')[0]}`);
    }
  }

  assert.deepEqual(failures, [], `view(s) that cannot compile: ${failures.join(' | ')}`);
});

test('no view emits unescaped output except include()', () => {
  const offenders = [];

  for (const file of viewFiles()) {
    const source = fs.readFileSync(path.join(VIEWS, file), 'utf8').replace(/<%#[\s\S]*?%>/g, '');

    for (const [, expression] of source.matchAll(/<%-([\s\S]*?)%>/g)) {
      const trimmed = expression.trim();
      const isInclude = /^include\(\s*(['"])[^'"]+\1\s*(,\s*\{[^}]*\})?\s*\)$/.test(trimmed);
      if (!isInclude) offenders.push(`${file}: <%- ${trimmed} %>`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `unescaped output (potential XSS): ${offenders.join(' | ')}. Use <%= %>, which escapes.`
  );
});

test('no EJS comment contains a stray closing tag', () => {
  // A `%>` inside a `<%# ... %>` comment ends it early and the remainder is
  // printed into the page. Easy to do when the comment quotes template syntax.
  const offenders = [];

  for (const file of viewFiles()) {
    const source = fs.readFileSync(path.join(VIEWS, file), 'utf8');
    for (const [, body] of source.matchAll(/<%#([\s\S]*?)%>/g)) {
      if (body.includes('<%')) offenders.push(file);
    }
  }

  assert.deepEqual(offenders, [], `comment(s) quoting EJS tags: ${offenders.join(', ')}`);
});
