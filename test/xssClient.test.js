const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Regression guard for the DOM XSS sinks in the client scripts.
//
// public/js/endGame.js and public/js/teddyStats.js (since removed - nothing
// ever loaded it) both built HTML by interpolating database values into
// template strings assigned to innerHTML. Event titles and teddy names are
// attacker-influenced, so a crafted value executed in the browser of every
// visitor. Server-rendered values are covered separately: test/viewRender.test.js
// pushes a hostile teddy name through the real templates.
//
// There is no DOM here, so this asserts the shape of the source: the sinks are
// gone and textContent is used instead. A full browser test would be better,
// but this catches a regression cheaply and needs no new dependency.

const CLIENT_JS = path.join(__dirname, '..', 'public', 'js');

const readScript = (name) => fs.readFileSync(path.join(CLIENT_JS, name), 'utf8');

for (const file of ['endGame.js']) {
  test(`${file} does not assign to innerHTML`, () => {
    const source = readScript(file);
    const offenders = source
      .split('\n')
      .map((line, i) => [i + 1, line])
      .filter(([, line]) => /\.innerHTML\s*=/.test(line) && !line.trim().startsWith('//'));

    assert.deepEqual(
      offenders,
      [],
      `innerHTML assignment found: ${offenders.map(([n, l]) => `L${n}: ${l.trim()}`).join(' | ')}`
    );
  });

  test(`${file} builds text with textContent`, () => {
    assert.match(readScript(file), /textContent/, 'expected textContent-based rendering');
  });

  test(`${file} has no other HTML-parsing sinks`, () => {
    const source = readScript(file);
    for (const sink of ['insertAdjacentHTML', 'outerHTML', 'document.write', 'eval(']) {
      assert.ok(!source.includes(sink), `unexpected sink: ${sink}`);
    }
  });
}

test('every client script referenced by a view is free of innerHTML', () => {
  // Wider sweep: catches a new sink appearing in any shipped client script.
  const viewsDir = path.join(__dirname, '..', 'views');
  const viewSource = fs
    .readdirSync(viewsDir, { recursive: true })
    .filter((f) => String(f).endsWith('.ejs'))
    .map((f) => fs.readFileSync(path.join(viewsDir, String(f)), 'utf8'))
    .join('\n');

  const referenced = fs
    .readdirSync(CLIENT_JS)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => viewSource.includes(f));

  assert.ok(referenced.length > 0, 'expected to find client scripts referenced by views');

  const withSinks = referenced.filter((f) => /\.innerHTML\s*=/.test(readScript(f)));
  assert.deepEqual(withSinks, [], `innerHTML assignment in shipped script(s): ${withSinks.join(', ')}`);
});
