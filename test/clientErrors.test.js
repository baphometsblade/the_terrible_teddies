const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { handleErrors, clientErrorStatus } = require('../middleware/errorHandlers');

// A stranger can send a body that is not JSON, is far too large, claims to be
// gzip and is not, or has thousands of form fields, for free. Those are the
// sender's mistakes, so the answer is a 4xx. They used to reach a catch-all
// error handler that made every error a 500 and wrote a stack trace to the log
// each time. Fuzzing the demo with exactly those requests is what showed it.
//
// Our own failures must still be failures, so that is covered too.
//
// Status text is read from http.STATUS_CODES rather than written out: Node has
// been renaming some of those texts to follow the newer HTTP RFCs.

const SERVER = path.join(__dirname, '..', 'server.js');
const statusText = (status) => http.STATUS_CODES[status];

// Boots the real app in a child process and sends it each request. Never in
// this process: server.js reads .env, and a developer's .env may point at a
// real database. Returns what came back and everything the app logged.
function probe(requests, { before = '' } = {}) {
  const script = `
    ${before}
    const { createApp } = require(${JSON.stringify(SERVER)});
    const requests = ${JSON.stringify(requests)};

    function bodyOf(spec) {
      if (spec === undefined) return undefined;
      if (typeof spec === 'string') return spec;
      if (spec.repeat) return spec.prefix + 'A'.repeat(spec.repeat) + spec.suffix;
      if (spec.fields) return Array.from({ length: spec.fields }, (_, i) => 'k' + i + '=v').join('&');
      throw new Error('unknown body spec');
    }

    const server = createApp().listen(0, async () => {
      const base = 'http://127.0.0.1:' + server.address().port;
      const out = {};
      for (const r of requests) {
        const headers = Object.assign({}, r.type ? { 'content-type': r.type } : {}, r.headers || {});
        try {
          const res = await fetch(base + r.path, { method: r.method, headers, body: bodyOf(r.body), redirect: 'manual' });
          out[r.name] = { status: res.status, type: res.headers.get('content-type') || '', body: (await res.text()).slice(0, 300) };
        } catch (error) {
          out[r.name] = { error: String((error.cause && error.cause.code) || error.message) };
        }
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
      SESSION_SECRET: 'client-errors-test'
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60000
  });

  const stdout = result.stdout || '';
  const match = /<<<([A-Za-z0-9+/=]*)>>>/.exec(stdout);
  assert.ok(
    match,
    `probe produced no payload.\nstdout: ${stdout.slice(0, 400)}\nstderr: ${(result.stderr || '').slice(0, 400)}`
  );

  return {
    results: JSON.parse(Buffer.from(match[1], 'base64').toString('utf8')),
    log: stdout.replace(match[0], '') + (result.stderr || '')
  };
}

// ECHOMARK is a marker for "the sender's bytes". JSON.parse quotes the start of
// a bad body in its error message, so if the log or a response ever contains
// it, the body is being echoed.
const JSON_TYPE = 'application/json';
const FORM_TYPE = 'application/x-www-form-urlencoded';

const REQUESTS = [
  { name: 'validApi', method: 'POST', path: '/api/demo/battle', type: JSON_TYPE, body: '{"teddyId":"x"}' },
  { name: 'validPage', method: 'GET', path: '/play' },
  { name: 'badJson', method: 'POST', path: '/api/demo/battle', type: JSON_TYPE, body: 'ECHOMARK-7f3a is not json' },
  { name: 'nullJson', method: 'POST', path: '/api/demo/battle', type: JSON_TYPE, body: 'null' },
  { name: 'controlChar', method: 'POST', path: '/api/demo/battle', type: JSON_TYPE, body: '{"a":"x\ny"}' },
  { name: 'hugeJson', method: 'POST', path: '/api/demo/battle', type: JSON_TYPE, body: { prefix: '{"teddyId":"', repeat: 150000, suffix: '"}' } },
  { name: 'badGzip', method: 'POST', path: '/api/demo/battle', type: JSON_TYPE, body: 'definitely not gzip', headers: { 'content-encoding': 'gzip' } },
  { name: 'tooManyFields', method: 'POST', path: '/play/start', type: FORM_TYPE, body: { fields: 1500 } },
  { name: 'badJsonPage', method: 'POST', path: '/play/start', type: JSON_TYPE, body: '{bad json' }
];

let cached;
const run = () => (cached = cached || probe(REQUESTS));

const asJson = (result) => JSON.parse(result.body);

test('valid requests still succeed, so the probe is not just collecting errors', () => {
  const { results } = run();
  assert.equal(results.validApi.status, 200);
  assert.match(results.validApi.type, /application\/json/);
  assert.equal(results.validPage.status, 200);
  assert.match(results.validPage.type, /text\/html/);
});

test('a body that is not valid JSON is a 400, not a 500', () => {
  const { results } = run();
  for (const name of ['badJson', 'nullJson', 'controlChar']) {
    const result = results[name];
    assert.equal(result.status, 400, `${name}: ${JSON.stringify(result)}`);
    assert.match(result.type, /application\/json/, name);
    assert.deepEqual(asJson(result), { error: 'bad_request', message: statusText(400) }, name);
  }
});

test('a body that claims to be gzip and is not is a 400', () => {
  const result = run().results.badGzip;
  assert.equal(result.status, 400, JSON.stringify(result));
  assert.equal(asJson(result).error, 'bad_request');
});

test('an oversized body is a 413', () => {
  const { results } = run();
  assert.equal(results.hugeJson.status, 413, JSON.stringify(results.hugeJson));
  assert.deepEqual(asJson(results.hugeJson), { error: 'payload_too_large', message: statusText(413) });

  // Thousands of form fields are the same kind of mistake.
  assert.equal(results.tooManyFields.status, 413, JSON.stringify(results.tooManyFields));
});

test('a route a browser uses answers in plain text, not JSON', () => {
  const { results } = run();
  assert.equal(results.badJsonPage.status, 400);
  assert.match(results.badJsonPage.type, /^text\/plain/);
  assert.equal(results.badJsonPage.body, statusText(400));

  assert.equal(results.tooManyFields.status, 413);
  assert.match(results.tooManyFields.type, /^text\/plain/);
  assert.equal(results.tooManyFields.body, statusText(413));
});

test('no response leaks a stack trace or the request body', () => {
  const { results } = run();
  const leaks = [];
  for (const [name, result] of Object.entries(results)) {
    if (result.status < 400) continue;
    if (/\bat\s+\S+\s+\(|node_modules|SyntaxError|JSON\.parse|ECHOMARK/.test(result.body)) leaks.push(name);
  }
  assert.deepEqual(leaks, []);
});

test('client errors are logged as one short line, with no stack and none of the body', () => {
  const { log } = run();

  for (const line of [
    'Rejected request: 400 POST /api/demo/battle',
    'Rejected request: 413 POST /api/demo/battle',
    'Rejected request: 413 POST /play/start',
    'Rejected request: 400 POST /play/start'
  ]) {
    assert.ok(log.includes(line), `expected the log to contain "${line}"; log was:\n${log}`);
  }

  assert.equal(log.includes('Unhandled application error'), false, 'a sender mistake is not an application error');
  assert.equal(log.includes('ECHOMARK'), false, 'the request body must not be echoed into the log');
  assert.equal(/\n\s+at /.test(log), false, 'no stack frames for a sender mistake');
});

test('a failure of our own is still a 500, logged with its stack', () => {
  // Make rendering throw, as a broken template would. Patched before the app
  // loads, on the same express module instance server.js will use.
  const express = require.resolve('express');
  const { results, log } = probe([{ name: 'boom', method: 'GET', path: '/play' }], {
    before: `require(${JSON.stringify(express)}).response.render = function () { throw new Error('forced render failure'); };`
  });

  assert.equal(results.boom.status, 500, JSON.stringify(results.boom));
  assert.equal(results.boom.body, 'There was an error serving your request.');
  assert.ok(log.includes('Unhandled application error: forced render failure'), log);
  assert.match(log, /Error: forced render failure\n\s+at /, 'the stack is logged for our own failures');
  assert.equal(log.includes('Rejected request'), false);
});

// The handler on its own, with a stand-in request and response.

function fakeRes({ headersSent = false } = {}) {
  const res = { headersSent, statusCode: undefined, contentType: undefined, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.type = (value) => { res.contentType = value; return res; };
  res.send = (value) => { res.body = value; return res; };
  res.json = (value) => { res.contentType = 'application/json'; res.body = value; return res; };
  return res;
}

const fakeReq = (overrides = {}) => ({
  method: 'POST',
  originalUrl: '/play/start',
  accepts: () => 'html',
  ...overrides
});

function withCapturedLog(fn) {
  const log = { warn: [], error: [] };
  const { warn, error } = console;
  console.warn = (...args) => log.warn.push(args.join(' '));
  console.error = (...args) => log.error.push(args.join(' '));
  try {
    fn();
  } finally {
    console.warn = warn;
    console.error = error;
  }
  return log;
}

function handle(err, reqOverrides, resOptions) {
  const req = fakeReq(reqOverrides);
  const res = fakeRes(resOptions);
  const outcome = { res, nextCalled: false, nextArg: undefined };
  outcome.log = withCapturedLog(() =>
    handleErrors(err, req, res, (arg) => {
      outcome.nextCalled = true;
      outcome.nextArg = arg;
    })
  );
  return outcome;
}

test('clientErrorStatus: only a 4xx status is the sender\'s doing', () => {
  const cases = [
    [{ status: 400 }, 400],
    [{ statusCode: 413 }, 413],
    [{ status: 499 }, 499],
    [{ status: 399 }, null],
    [{ status: 500 }, null],
    [{ status: 503 }, null],
    [{ status: 'abc' }, null],
    [{}, null],
    [new Error('plain'), null],
    ['a string', null],
    [null, null],
    [undefined, null]
  ];
  for (const [err, expected] of cases) {
    assert.equal(clientErrorStatus(err), expected, `clientErrorStatus(${JSON.stringify(err)})`);
  }
});

test('handleErrors answers a client error with its own status, logged as one short line', () => {
  const err = Object.assign(new SyntaxError('Unexpected token E, "ECHOMARK" is not valid JSON'), { status: 400 });
  const { res, log, nextCalled } = handle(err);

  assert.equal(res.statusCode, 400);
  assert.equal(res.contentType, 'text/plain');
  assert.equal(res.body, statusText(400));
  assert.equal(nextCalled, false);
  assert.deepEqual(log.warn, ['Rejected request: 400 POST /play/start']);
  assert.deepEqual(log.error, [], 'a sender mistake is not an application error');
});

test('handleErrors keeps the query string out of the log', () => {
  const err = Object.assign(new Error('x'), { status: 400 });
  const { log } = handle(err, { originalUrl: '/play/start?token=hunter2' });
  assert.deepEqual(log.warn, ['Rejected request: 400 POST /play/start']);
});

test('handleErrors answers API callers with JSON and a stable code', () => {
  const expected = [
    [400, 'bad_request'],
    [413, 'payload_too_large'],
    [415, 'unsupported_media_type'],
    [422, 'bad_request']
  ];
  for (const [status, code] of expected) {
    const err = Object.assign(new Error('x'), { status });

    const byPath = handle(err, { originalUrl: '/api/anything' }).res;
    assert.equal(byPath.statusCode, status);
    assert.deepEqual(byPath.body, { error: code, message: statusText(status) }, `${status} by path`);

    const byHeader = handle(err, { accepts: () => 'json' }).res;
    assert.deepEqual(byHeader.body, { error: code, message: statusText(status) }, `${status} by Accept header`);
  }
});

test('handleErrors keeps our own failures as 500s with the stack logged', () => {
  const { res, log } = handle(new Error('boom'));

  assert.equal(res.statusCode, 500);
  assert.equal(res.body, 'There was an error serving your request.');
  assert.equal(log.error[0], 'Unhandled application error: boom');
  assert.match(log.error[1], /Error: boom\n\s+at /);
  assert.deepEqual(log.warn, []);

  const api = handle(new Error('boom'), { originalUrl: '/api/anything' }).res;
  assert.equal(api.statusCode, 500);
  assert.deepEqual(api.body, { error: 'server_error', message: 'There was an error serving your request.' });
});

test('handleErrors treats a status outside 4xx as our failure', () => {
  for (const status of [302, 399, 500, 503, 600]) {
    const { res, log } = handle(Object.assign(new Error('x'), { status }));
    assert.equal(res.statusCode, 500, `status ${status}`);
    assert.equal(log.error.length > 0, true, `status ${status} should be logged as an error`);
  }
});

test('handleErrors hands over to Express once a response has started', () => {
  const err = Object.assign(new Error('late'), { status: 400 });
  const { res, log, nextCalled, nextArg } = handle(err, {}, { headersSent: true });

  assert.equal(nextCalled, true);
  assert.equal(nextArg, err);
  assert.equal(res.statusCode, undefined, 'nothing more is written');
  assert.equal(res.body, undefined);
  assert.deepEqual([...log.warn, ...log.error], []);
});

test('handleErrors survives being handed something that is not an Error', () => {
  for (const thrown of ['a string', 42, null, undefined]) {
    const { res } = handle(thrown);
    assert.equal(res.statusCode, 500, `thrown: ${String(thrown)}`);
  }
});
