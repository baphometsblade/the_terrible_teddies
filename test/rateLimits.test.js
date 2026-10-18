const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { clientKey } = require('../middleware/rateLimits');

// What a rate limit does to a visitor: the whole app, started the way Render
// starts it (production, behind a proxy that names the visitor in
// X-Forwarded-For). Which routes carry a limit is checked in authCoverage; this
// checks that a limit does what it says, counts the right visitor, and leaves
// ordinary play alone.

const SERVER = path.join(__dirname, '..', 'server.js');

// Everything inside the template string runs in a child process, which is where
// the real server is started (see the note in boundedSessionStore.test.js).
function probe(extraEnv = {}) {
  const script = `
    const { createApp } = require(${JSON.stringify(SERVER)});
    const server = createApp().listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      const form = { 'content-type': 'application/x-www-form-urlencoded' };

      // 'proxy' is what X-Forwarded-For says, as the platform's proxy writes it.
      // 'edge' is the header CLIENT_IP_HEADER may name.
      const call = async (route, who, init) => {
        init = init || {};
        const headers = Object.assign({ 'x-forwarded-proto': 'https' }, init.headers);
        if (who.proxy) headers['x-forwarded-for'] = who.proxy;
        if (who.edge) headers['true-client-ip'] = who.edge;
        const res = await fetch(base + route, {
          method: init.method || 'GET',
          headers,
          body: init.body,
          redirect: 'manual'
        });
        const body = await res.text();
        return {
          status: res.status,
          type: res.headers.get('content-type') || '',
          retryAfter: res.headers.get('retry-after'),
          limit: res.headers.get('ratelimit-limit'),
          cookie: (res.headers.getSetCookie().find((c) => c.startsWith('tt.sid=')) || '').split(';')[0],
          body
        };
      };

      // Asks for the same JSON route until it is refused.
      const exhaust = async (who) => {
        const first = await call('/api/demo/teddies', who);
        let served = first.status === 200 ? 1 : 0;
        let refused = first.status === 429 ? first : null;
        for (let i = 0; i < 1000 && !refused; i++) {
          const res = await call('/api/demo/teddies', who);
          if (res.status === 429) refused = res; else served++;
        }
        return { limit: first.limit, served, refused };
      };

      const out = {};

      // One visitor wears out their allowance.
      const noisy = { proxy: '203.0.113.10' };
      const worn = await exhaust(noisy);
      out.limit = worn.limit;
      out.served = worn.served;
      out.refused = worn.refused;
      out.refusedPage = await call('/play', noisy);

      // And nobody else notices, nor do the things that are not actions.
      out.otherVisitor = (await call('/api/demo/teddies', { proxy: '203.0.113.11' })).status;
      out.health = (await call('/health', noisy)).status;
      out.stylesheet = (await call('/css/style.css', noisy)).status;

      // Playing a whole battle is nowhere near the limit.
      const player = { proxy: '203.0.113.12' };
      const started = await call('/play/start', player, { method: 'POST', headers: form, body: 'teddyId=' });
      const statuses = [started.status];
      for (let i = 0; i < 40; i++) {
        const turn = await call('/play/turn', player, {
          method: 'POST',
          headers: Object.assign({ cookie: started.cookie }, form),
          body: 'move=attack'
        });
        statuses.push(turn.status);
      }
      out.sessionIssued = Boolean(started.cookie);
      out.play = statuses;

      // Two visitors the proxy cannot tell apart, but the edge can. Whether they
      // share an allowance depends on CLIENT_IP_HEADER.
      const sameProxy = '203.0.113.50';
      await exhaust({ proxy: sameProxy, edge: '198.51.100.1' });
      out.sameProxyOtherEdge = (await call('/api/demo/teddies', { proxy: sameProxy, edge: '198.51.100.2' })).status;
      out.sameProxySameEdge = (await call('/api/demo/teddies', { proxy: sameProxy, edge: '198.51.100.1' })).status;

      // A value that is not an address counts as no header at all.
      const fallback = '203.0.113.60';
      await exhaust({ proxy: fallback });
      out.notAnAddress = (await call('/api/demo/teddies', { proxy: fallback, edge: 'not an address' })).status;

      process.stdout.write('<<<' + JSON.stringify(out) + '>>>');
      process.exit(0);
    });
  `;

  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DEMO_MODE: 'true',
      DATABASE_URL: '',
      SESSION_SECRET: 'rate-limit-test',
      CLIENT_IP_HEADER: '',
      ...extraEnv
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60000
  });

  const match = /<<<([\s\S]*?)>>>/.exec(result.stdout || '');
  assert.ok(
    match,
    `probe produced no payload. stderr: ${(result.stderr || '').slice(0, 600)} stdout: ${(result.stdout || '').slice(0, 300)}`
  );
  return { ...JSON.parse(match[1]), log: result.stderr || '' };
}

const defaults = probe();
const named = probe({ CLIENT_IP_HEADER: 'True-Client-IP' });

test('a visitor is served up to the advertised limit and refused after it', () => {
  const limit = Number(defaults.limit);
  assert.ok(Number.isInteger(limit) && limit > 0, `RateLimit-Limit should be a positive number, got ${defaults.limit}`);
  assert.equal(defaults.served, limit, 'exactly the advertised number of requests is served');
  assert.equal(defaults.refused.status, 429, 'and the next one is refused');
});

test('a refusal says when to come back, in the shape the caller asked for', () => {
  const { refused, refusedPage } = defaults;

  const wait = Number(refused.retryAfter);
  assert.ok(Number.isInteger(wait) && wait >= 1 && wait <= 60, `Retry-After should be 1 to 60 seconds, got ${refused.retryAfter}`);

  assert.match(refused.type, /application\/json/, 'an API route answers in JSON');
  assert.equal(JSON.parse(refused.body).error, 'rate_limited');

  assert.equal(refusedPage.status, 429, 'the allowance is shared across the visitor\'s routes');
  assert.match(refusedPage.type, /text\/plain/, 'a page answers in text, not a stack trace');
  assert.match(refusedPage.body, /too many requests/i);
});

test('one visitor using up their allowance does not affect anyone else', () => {
  assert.equal(defaults.otherVisitor, 200);
});

test('the health check and the stylesheet are never throttled', () => {
  assert.equal(defaults.health, 200, 'a limit on /health could get a healthy service restarted');
  assert.equal(defaults.stylesheet, 200, 'static files are served before any limit');
});

test('a whole battle is far below the limit', () => {
  assert.equal(defaults.sessionIssued, true, 'control: the battle really had a session');
  assert.equal(defaults.play.length, 41);
  assert.deepEqual(defaults.play.filter((status) => status === 429), [], 'no request of a battle was throttled');
});

test('by default the visitor is the address the proxy reports, and a header from the visitor changes nothing', () => {
  // Same X-Forwarded-For throughout, and a different True-Client-IP each time.
  // If that header counted without being asked for, the second and third would
  // be served; anyone could dodge the limit by inventing one.
  assert.equal(defaults.sameProxyOtherEdge, 429);
  assert.equal(defaults.sameProxySameEdge, 429);
});

test('CLIENT_IP_HEADER counts the address the platform names instead', () => {
  assert.equal(named.served, Number(named.limit), 'ordinary limits still apply');
  assert.equal(named.sameProxyOtherEdge, 200, 'a different edge address is a different visitor, whatever the proxy says');
  assert.equal(named.sameProxySameEdge, 429, 'the same edge address is the same visitor');
  assert.equal(named.notAnAddress, 429, 'a value that is not an address falls back to the proxy address, whose allowance was used up');
});

test('clientKey: req.ip unless a named header holds an address', () => {
  const request = (ip, headers = {}) => ({ ip, get: (name) => headers[name.toLowerCase()] });
  const saved = process.env.CLIENT_IP_HEADER;

  try {
    delete process.env.CLIENT_IP_HEADER;
    assert.equal(clientKey(request('10.0.0.5', { 'true-client-ip': '203.0.113.9' })), '10.0.0.5', 'header ignored when not named');

    process.env.CLIENT_IP_HEADER = 'True-Client-IP';
    assert.equal(clientKey(request('10.0.0.5', { 'true-client-ip': ' 203.0.113.9 ' })), '203.0.113.9', 'named header wins, trimmed');
    assert.equal(clientKey(request('10.0.0.5', { 'true-client-ip': '203.0.113.9, 10.1.1.1' })), '10.0.0.5', 'a list is not an address');
    assert.equal(clientKey(request('10.0.0.5', { 'true-client-ip': 'localhost' })), '10.0.0.5', 'nor is a name');
    assert.equal(clientKey(request('10.0.0.5')), '10.0.0.5', 'absent header falls back');

    // Addresses in one IPv6 /56 are one visitor: a single customer is handed a
    // whole range, so counting each address separately would be no limit at all.
    assert.equal(
      clientKey(request('10.0.0.5', { 'true-client-ip': '2001:db8:abcd:1200::1' })),
      clientKey(request('10.0.0.5', { 'true-client-ip': '2001:db8:abcd:12ff::beef' }))
    );
  } finally {
    if (saved === undefined) delete process.env.CLIENT_IP_HEADER; else process.env.CLIENT_IP_HEADER = saved;
  }
});

// The check for a header that never arrives keeps a count, so each case below
// gets its own copy of the module and starts from zero.
function freshClientKey() {
  const file = require.resolve('../middleware/rateLimits');
  const original = require.cache[file];
  delete require.cache[file];
  try {
    return require('../middleware/rateLimits').clientKey;
  } finally {
    require.cache[file] = original;
  }
}

function warningsFrom(fn) {
  const original = console.warn;
  const lines = [];
  console.warn = (...args) => lines.push(args.join(' '));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return lines;
}

function withHeaderSetting(value, fn) {
  const saved = process.env.CLIENT_IP_HEADER;
  if (value === undefined) delete process.env.CLIENT_IP_HEADER; else process.env.CLIENT_IP_HEADER = value;
  try {
    return fn();
  } finally {
    if (saved === undefined) delete process.env.CLIENT_IP_HEADER; else process.env.CLIENT_IP_HEADER = saved;
  }
}

const request = (ip, headers = {}) => ({ ip, get: (name) => headers[name.toLowerCase()] });

test('a named header that never arrives is reported once, with no visitor address in it', () => {
  withHeaderSetting('True-Client-IP', () => {
    const key = freshClientKey();

    const early = warningsFrom(() => {
      for (let i = 0; i < 19; i++) key(request(`10.0.0.${i}`));
    });
    assert.deepEqual(early, [], 'nineteen requests are not yet a pattern');

    const twentieth = warningsFrom(() => key(request('10.0.1.19')));
    assert.equal(twentieth.length, 1, 'said on the twentieth request');
    assert.match(twentieth[0], /CLIENT_IP_HEADER is True-Client-IP/);
    assert.match(twentieth[0], /first 20 requests/);
    assert.doesNotMatch(twentieth[0], /10\.0\./, 'no visitor address goes in the log');

    const after = warningsFrom(() => {
      for (let i = 20; i < 80; i++) {
        // Half carry nothing, half carry something that is not an address.
        key(request(`10.0.1.${i}`, i % 2 ? { 'true-client-ip': 'not an address' } : {}));
      }
    });
    assert.deepEqual(after, [], 'and not again');
  });
});

test('the header name in the report cannot break the log line', () => {
  withHeaderSetting('X-Odd Name\nsecond line', () => {
    const key = freshClientKey();
    const said = warningsFrom(() => {
      for (let i = 0; i < 20; i++) key(request('10.0.0.1'));
    });
    assert.equal(said.length, 1);
    assert.doesNotMatch(said[0], /[\r\n]/, 'one line, whatever the setting held');
    assert.match(said[0], /CLIENT_IP_HEADER is X-Odd\?Name\?second\?line,/);
  });
});

test('the missing-header report stays quiet once the header has been seen, or when none is named', () => {
  withHeaderSetting('True-Client-IP', () => {
    const key = freshClientKey();
    const said = warningsFrom(() => {
      for (let i = 0; i < 5; i++) key(request('10.0.0.1'));
      key(request('10.0.0.1', { 'true-client-ip': '203.0.113.9' }));
      for (let i = 0; i < 100; i++) key(request('10.0.0.1'));
    });
    assert.deepEqual(said, [], 'one request that carried the address settles it');
  });

  withHeaderSetting(undefined, () => {
    const key = freshClientKey();
    const said = warningsFrom(() => {
      for (let i = 0; i < 100; i++) key(request('10.0.0.1'));
    });
    assert.deepEqual(said, [], 'with no header named there is nothing to be missing');
  });
});

test('in the real app the report appears once in the log, and only when a header is named', () => {
  const lines = named.log.split(/\r?\n/).filter((line) => line.includes('CLIENT_IP_HEADER is True-Client-IP'));
  assert.equal(lines.length, 1, `expected one report, the log was: ${named.log.slice(0, 400)}`);

  assert.doesNotMatch(defaults.log, /CLIENT_IP_HEADER/, 'no header named, nothing to report');
});
