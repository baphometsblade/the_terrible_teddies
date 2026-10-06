const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// An unreachable database must stop the boot quickly, with a message that names
// the host and never the credentials.
//
// bootstrap() awaits connectDatabase() before it binds a port. mongoose.connect()
// with no serverSelectionTimeoutMS waits 30 seconds, and for a mongodb+srv://
// host whose cluster is gone the DNS lookup rejects outside the driver's promise
// chain and takes the process down with a raw stack trace. Both look like a
// stalled deploy. A paused Atlas free-tier cluster is exactly this state.
//
// The URIs are assembled from parts so that no credentialed connection string
// appears literally in this file; test/noSecrets.test.js would rightly flag it.

const SERVER = path.join(__dirname, '..', 'server.js');
const USER = 'probeuser';
const PASSWORD = 's3cr3t-probe-pw';

const uri = (scheme, host) => `${scheme}://` + USER + ':' + PASSWORD + '@' + host + '/teddies';

function run(args, env) {
  return spawnSync(process.execPath, args, {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      SESSION_SECRET: 'db-connect-test',
      // dotenv never overrides a variable that is already set, so a developer's
      // real .env cannot leak into these runs.
      DEMO_MODE: '',
      ...env
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60000
  });
}

// Call connectDatabase() in a child process and report what it did.
function connect(databaseUrl, env = {}) {
  const script = `
    const { connectDatabase } = require(${JSON.stringify(SERVER)});
    const started = Date.now();
    const done = (out) => {
      process.stdout.write('<<<' + JSON.stringify({ ...out, ms: Date.now() - started }) + '>>>');
      process.exit(0);
    };
    connectDatabase().then(
      (value) => done({ ok: true, value }),
      (error) => done({ ok: false, message: error.message })
    );
  `;

  const result = run(['-e', script], { DATABASE_URL: databaseUrl, ...env });
  const match = /<<<(.*)>>>/s.exec(result.stdout || '');
  assert.ok(match, `probe printed nothing parseable.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);

  return { ...JSON.parse(match[1]), output: `${result.stdout}${result.stderr}` };
}

test('a database that refuses connections fails within the timeout, naming the host only', () => {
  const result = connect(uri('mongodb', '127.0.0.1:1'), { DB_TIMEOUT_MS: '600' });

  assert.equal(result.ok, false, 'connecting to a closed port must reject');
  assert.match(result.message, /Could not reach MongoDB at 127\.0\.0\.1 within 600ms/);
  assert.match(result.message, /DEMO_MODE=true/, 'the message should say how to get out of this');

  // Without serverSelectionTimeoutMS the driver waits 30 seconds.
  assert.ok(result.ms < 15000, `took ${result.ms}ms; the timeout is not being applied`);

  assert.ok(!result.output.includes(PASSWORD), 'the password must not appear in any output');
  assert.ok(!result.output.includes(USER), 'the username must not appear in any output');
});

test('an SRV host that does not resolve is reported as a DNS failure, not a crash', () => {
  const result = connect(uri('mongodb+srv', 'teddies-probe.invalid'), { DB_TIMEOUT_MS: '3000' });

  assert.equal(result.ok, false, 'an unresolvable cluster must reject, not exit the process');
  assert.match(result.message, /DNS lookup for teddies-probe\.invalid failed/);
  assert.match(result.message, /Could not reach MongoDB at teddies-probe\.invalid/);
  assert.ok(result.ms < 15000, `took ${result.ms}ms`);

  assert.ok(!result.output.includes(PASSWORD), 'the password must not appear in any output');
  assert.ok(!result.output.includes(USER), 'the username must not appear in any output');
});

test('demo mode skips the database without touching the network', () => {
  // Also the control for the two tests above: it shows the harness can tell a
  // connectDatabase() that resolves from one that rejects.
  const result = connect(uri('mongodb', '127.0.0.1:1'), { DEMO_MODE: 'true', DB_TIMEOUT_MS: '600' });

  assert.equal(result.ok, true);
  assert.equal(result.value, false, 'connectDatabase() returns false when it skips the database');
  assert.ok(result.ms < 2000, `took ${result.ms}ms; demo mode should not wait on anything`);
});

test('npm start against an unreachable database exits 1 instead of hanging', () => {
  const started = Date.now();
  const result = run([SERVER], {
    DATABASE_URL: uri('mongodb', '127.0.0.1:1'),
    DB_TIMEOUT_MS: '600',
    PORT: '0'
  });
  const elapsed = Date.now() - started;
  const output = `${result.stdout}${result.stderr}`;

  assert.equal(result.status, 1, `expected exit code 1, got ${result.status}. Output: ${output.slice(0, 400)}`);
  assert.match(output, /Startup failed: Could not reach MongoDB at 127\.0\.0\.1/);
  assert.ok(!/running at http/.test(output), 'the server must not claim to be listening');
  assert.ok(elapsed < 15000, `took ${elapsed}ms`);

  assert.ok(!output.includes(PASSWORD), 'the password must not appear in any output');
  assert.ok(!output.includes(USER), 'the username must not appear in any output');
});
