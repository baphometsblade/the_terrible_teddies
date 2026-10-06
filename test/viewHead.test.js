const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ejs = require('ejs');

// Every page's <head> comes from one partial, and it has to be a good one.
//
// A pass over /play in a real browser found four things no test had looked at:
// no viewport meta (a phone drew the page at 980px and shrank it), a tab title
// that was the bare repo name, no description or social tags, and a
// /favicon.ico 404 on every load. Seven views also wrapped the partial in their
// own <head> and added a second <title>, which browsers ignore, so the page
// they showed was the repo name anyway.
//
// The scan below is structural, so a new view cannot quietly skip the viewport.

const ROOT = path.join(__dirname, '..');
const SERVER = path.join(ROOT, 'server.js');
const VIEWS = path.join(ROOT, 'views');
const HEAD = path.join(VIEWS, 'partials', '_head.ejs');

const HOSTILE = '<img src=x onerror=alert(1)>';
const SHARED_HEAD = /<%-\s*include\(\s*['"]partials\/_head\.ejs['"]/g;

function views() {
  return fs
    .readdirSync(VIEWS, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.ejs'))
    .map((file) => ({
      file,
      // Comments never reach the browser, so a tag quoted in one is not a tag.
      source: fs
        .readFileSync(path.join(VIEWS, file), 'utf8')
        .replace(/<%#[\s\S]*?%>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
    }));
}

function headProblems(source) {
  const problems = [];
  const includes = source.match(SHARED_HEAD) || [];
  const declaresViewport = /<meta\b[^>]*\bname\s*=\s*["']viewport["']/i.test(source);

  if (includes.length === 0) {
    // A fragment (navbar, footer) has nothing to check. A full page that skips
    // the shared head has to bring its own viewport.
    if (/<html\b/i.test(source) && !declaresViewport) {
      problems.push('full page with neither the shared head nor a viewport meta');
    }
    return problems;
  }

  if (includes.length > 1) problems.push(`includes the shared head ${includes.length} times`);
  if (/<\/?head\b/i.test(source)) problems.push('writes its own <head>');
  if (/<title\b/i.test(source)) problems.push('writes its own <title>');
  if (!/<html\b[^>]*>\s*<%-\s*include\(\s*['"]partials\/_head\.ejs['"]/i.test(source)) {
    problems.push('shared head is not directly after <html>');
  }
  if (!/_head\.ejs['"]\s*,\s*\{[\s\S]*?\bpageTitle\s*:/.test(source)) {
    problems.push('does not pass a pageTitle');
  }
  return problems;
}

const renderHead = (locals) => ejs.renderFile(HEAD, locals);

function metaContent(html, attr, key) {
  const match = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)">`).exec(html);
  return match ? match[1] : null;
}

test('shared head: declares charset, viewport, title, description, social tags and a favicon', async () => {
  const html = await renderHead({});

  assert.match(html, /<meta charset="UTF-8">/);
  assert.equal(metaContent(html, 'name', 'viewport'), 'width=device-width, initial-scale=1');
  assert.equal((html.match(/<title>/g) || []).length, 1, 'exactly one <title>');
  assert.match(html, /<title>Terrible Teddies<\/title>/, 'falls back to the site name');
  assert.ok(metaContent(html, 'name', 'description').length > 40, 'falls back to a real description');
  assert.equal(metaContent(html, 'property', 'og:title'), 'Terrible Teddies');
  assert.equal(metaContent(html, 'property', 'og:site_name'), 'Terrible Teddies');
  assert.equal(metaContent(html, 'property', 'og:type'), 'website');
  assert.ok(metaContent(html, 'property', 'og:description'));
  assert.equal(metaContent(html, 'name', 'twitter:card'), 'summary');
  assert.match(html, /<link rel="icon" href="\/favicon\.svg"/);
  assert.ok(fs.existsSync(path.join(ROOT, 'public', 'favicon.svg')), 'the favicon the head points at must exist');
});

test('shared head: still loads the stylesheets', async () => {
  const html = await renderHead({});
  assert.ok(html.includes('/css/style.css'));
  assert.ok(html.includes('cdn.jsdelivr.net/npm/bootstrap@5'));
  assert.ok(!html.includes('adventuretime'), 'the optional theme stays off unless asked for');

  const themed = await renderHead({ adventureTimeStyle: true });
  assert.ok(themed.includes('/css/adventuretime/style.css'));
});

test('shared head: a title and description are used, and escaped', async () => {
  const html = await renderHead({
    pageTitle: HOSTILE,
    pageDescription: '"><script>alert(1)</script>'
  });

  assert.ok(!html.includes('<img src=x'), 'a title must not become a live tag');
  assert.ok(!html.includes('<script>alert(1)</script>'), 'a description must not become a live tag');
  assert.ok(html.includes('<title>&lt;img src=x onerror=alert(1)&gt;</title>'));
  assert.equal(metaContent(html, 'property', 'og:title'), '&lt;img src=x onerror=alert(1)&gt;');

  const description = metaContent(html, 'name', 'description');
  assert.notEqual(description, null, 'a quote in the description must not break out of the attribute');
  assert.ok(description.includes('&lt;script&gt;'));
  assert.equal(metaContent(html, 'property', 'og:description'), description);
});

test('views: each includes the shared head once, right after <html>, and writes no <head> or <title> of its own', () => {
  const found = [];
  let includingViews = 0;

  for (const { file, source } of views()) {
    if ((source.match(SHARED_HEAD) || []).length) includingViews += 1;
    for (const problem of headProblems(source)) found.push(`${file}: ${problem}`);
  }

  assert.ok(includingViews >= 10, `expected the scan to see the views that include the head, saw ${includingViews}`);
  assert.deepEqual(found, []);
});

test('views: page titles are specific and unique', () => {
  const titles = new Map();

  for (const { file, source } of views()) {
    const match = /\bpageTitle\s*:\s*(['"])(.*?)\1/.exec(source);
    if (match) titles.set(file, match[2]);
  }

  assert.ok(titles.size >= 10, `expected a title per page, found ${titles.size}`);

  const seen = new Map();
  const problems = [];
  for (const [file, title] of titles) {
    if (title.length < 3 || title === 'the_terrible_teddies') problems.push(`${file}: "${title}"`);
    if (seen.has(title)) problems.push(`${file} and ${seen.get(title)} share "${title}"`);
    seen.set(title, file);
  }

  assert.deepEqual(problems, []);
});

test('head scan: the checks can fail', () => {
  const include = "<%- include('partials/_head.ejs', { pageTitle: 'X - Terrible Teddies' }) %>";

  assert.deepEqual(headProblems(`<html lang="en">\n${include}\n<body></body></html>`), []);
  assert.deepEqual(headProblems('<nav><a href="/">Home</a></nav>'), [], 'a fragment is not a page');

  const nested = headProblems(`<html lang="en">\n<head>\n${include}\n<title>X</title>\n</head><body></body></html>`);
  assert.ok(nested.includes('writes its own <head>'));
  assert.ok(nested.includes('writes its own <title>'));
  assert.ok(nested.includes('shared head is not directly after <html>'));

  assert.ok(
    headProblems(`<html lang="en">\n<%- include('partials/_head.ejs') %>\n<body></body></html>`).includes(
      'does not pass a pageTitle'
    )
  );
  assert.ok(
    headProblems(`<html lang="en">\n${include}\n${include}\n<body></body></html>`).includes(
      'includes the shared head 2 times'
    )
  );

  assert.equal(headProblems('<html><head><title>x</title></head><body></body></html>').length, 1);
  assert.deepEqual(
    headProblems('<html><head><meta name="viewport" content="width=device-width"></head><body></body></html>'),
    [],
    'a page with its own head is fine if it declares a viewport'
  );
});

function fetchPages(paths) {
  const script = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const paths = ${JSON.stringify(paths)};
    const server = createApp().listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      const out = {};
      for (const p of paths) {
        const res = await fetch(base + p, { redirect: 'manual' });
        out[p] = {
          status: res.status,
          type: res.headers.get('content-type'),
          csp: res.headers.get('content-security-policy'),
          body: await res.text()
        };
      }
      process.stdout.write('<<<' + Buffer.from(JSON.stringify(out)).toString('base64') + '>>>');
      process.exit(0);
    });
  `;

  const result = spawnSync(process.execPath, ['-e', script], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DEMO_MODE: 'true',
      DATABASE_URL: '',
      SESSION_SECRET: 'view-head-test'
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 60000
  });

  const match = /<<<([A-Za-z0-9+/=]*)>>>/.exec(result.stdout || '');
  assert.ok(match, `could not read the probe output (exit ${result.status})`);
  return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
}

test('the running app: public pages carry the head, and the favicon is served', () => {
  const pages = fetchPages(['/', '/play', '/nope', '/favicon.svg']);

  const titles = [];
  for (const route of ['/', '/play']) {
    const { status, type, body } = pages[route];
    assert.equal(status, 200, route);
    assert.match(type, /text\/html/, route);
    assert.equal((body.match(/<head\b/g) || []).length, 1, `${route} should have one <head>`);
    assert.equal((body.match(/<title\b/g) || []).length, 1, `${route} should have one <title>`);
    assert.equal(metaContent(body, 'name', 'viewport'), 'width=device-width, initial-scale=1', route);
    assert.ok(metaContent(body, 'name', 'description').length > 40, `${route} needs a description`);
    assert.ok(metaContent(body, 'property', 'og:title'), `${route} needs an og:title`);
    assert.match(body, /<link rel="icon" href="\/favicon\.svg"/, route);
    titles.push(/<title>([\s\S]*?)<\/title>/.exec(body)[1]);
  }

  assert.notEqual(titles[0], titles[1], 'the home page and the demo should not share a tab title');
  assert.ok(titles.every((t) => t !== 'the_terrible_teddies'), 'the bare repo name is not a title');

  const missing = pages['/nope'];
  assert.equal(missing.status, 404);
  assert.match(missing.body, /<meta name="viewport"/, 'the 404 page needs a viewport too');
  assert.match(missing.body, /<link rel="icon" href="\/favicon\.svg"/, 'and the favicon');

  const icon = pages['/favicon.svg'];
  assert.equal(icon.status, 200);
  assert.match(icon.type, /image\/svg\+xml/);
  assert.ok(icon.body.trimStart().startsWith('<svg'), 'the favicon should be an SVG document');

  // The favicon is same-origin, so img-src 'self' is what lets it load. If the
  // policy ever drops that, the icon disappears without any error in a test.
  assert.match(pages['/'].csp, /img-src[^;]*'self'/);
});

test('login and register render with their own title and description', async () => {
  for (const [view, title, description] of [
    ['login.ejs', 'Log in - Terrible Teddies', 'Log in to your Terrible Teddies account.'],
    ['register.ejs', 'Create an account - Terrible Teddies', 'Create a Terrible Teddies account to start collecting teddy fighters.']
  ]) {
    const html = await ejs.renderFile(path.join(VIEWS, view), { currentUser: null });
    assert.ok(html.includes(`<title>${title}</title>`), `${view} should carry its own title`);
    assert.equal(metaContent(html, 'name', 'description'), description, view);
    assert.equal(metaContent(html, 'name', 'viewport'), 'width=device-width, initial-scale=1', view);
  }
});
