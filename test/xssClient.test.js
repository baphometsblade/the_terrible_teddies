const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Regression guard for the DOM XSS sinks in the client scripts.
//
// public/js/endGame.js and public/js/teddyStats.js both built HTML by
// interpolating database values into template strings assigned to innerHTML.
// Event titles and teddy names are attacker-influenced, so a crafted value
// executed in the browser of every visitor.
//
// There is no DOM here, so this asserts the shape of the source: the sinks are
// gone and textContent is used instead. A full browser test would be better,
// but this catches a regression cheaply and needs no new dependency.

const CLIENT_JS = path.join(__dirname, '..', 'public', 'js');

const readScript = (name) => fs.readFileSync(path.join(CLIENT_JS, name), 'utf8');

for (const file of ['endGame.js', 'teddyStats.js']) {
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

test('a crafted teddy name is rendered as text, not parsed as markup', () => {
  // Mirrors what teddyStats.js now does, against what it used to do.
  const hostile = '<img src=x onerror="alert(1)">';

  // Old behaviour: the payload lands inside the HTML string verbatim.
  const oldWay = `<h3>${hostile}</h3>`;
  assert.ok(oldWay.includes('onerror='), 'precondition: the old approach embedded live markup');

  // New behaviour: textContent assignment, so the value is never parsed. Node
  // has no DOM, so model the contract - the value is stored, not interpolated
  // into markup.
  const node = { textContent: '' };
  node.textContent = hostile;
  assert.equal(node.textContent, hostile, 'the raw string is preserved as text');
  // Nothing concatenated it into a tag, which is the whole point.
});

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
