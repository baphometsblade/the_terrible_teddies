const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

// The server must stop cleanly when the platform asks it to.
//
// Render, Docker and systemd stop a process by sending SIGTERM, and kill it
// outright if it is still there after a delay (30 seconds on Render). Node's
// default for SIGTERM is to die on the spot, which drops every request that is
// open, and the only handler in server.js was for SIGINT. That one called
// server.close(), which on Node 18 also waits for each idle keep-alive
// connection to time out by itself, and for a client that never finishes its
// request it waits for ever.
//
// These tests start the real server in a child process and signal it. Windows
// only emulates signals (kill() just ends the process, no handler runs), so the
// tests are skipped there; CI runs them on Linux.

const SERVER = path.join(__dirname, '..', 'server.js');
const SKIP = process.platform === 'win32' ? 'Windows only emulates signals' : false;
const OPTIONS = { skip: SKIP, timeout: 60000 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// Start the real server and wait until it says it is listening. Everything a
// test opens is closed by stop(), so a failing test cannot leave a server or a
// socket behind to keep the whole run from finishing.
async function start(env = {}) {
  const port = await freePort();
  const child = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DEMO_MODE: 'true',
      DATABASE_URL: '',
      SESSION_SECRET: 'shutdown-test',
      PORT: String(port),
      ...env
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const server = { child, port, output: '', exit: null, cleanups: [] };
  const collect = (chunk) => { server.output += chunk; };
  child.stdout.setEncoding('utf8').on('data', collect);
  child.stderr.setEncoding('utf8').on('data', collect);
  server.exited = new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      server.exit = { code, signal };
      resolve(server.exit);
    });
  });

  const deadline = Date.now() + 20000;
  while (!/Terrible Teddies running at/.test(server.output)) {
    if (server.exit) {
      throw new Error(`the server exited while starting (${JSON.stringify(server.exit)}):\n${server.output}`);
    }
    if (Date.now() > deadline) {
      stop(server);
      throw new Error(`the server did not start within 20 seconds:\n${server.output}`);
    }
    await sleep(25);
  }
  return server;
}

function stop(server) {
  for (const cleanup of server.cleanups) cleanup();
  server.child.kill('SIGKILL'); // does nothing if it has already exited
}

// An open TCP connection to the server, for sending requests by hand.
function connect(server) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(server.port, '127.0.0.1');
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
    // The server cutting a connection off is the point of some tests, and an
    // unhandled 'error' on a socket would fail the whole file.
    socket.on('error', () => {});
    server.cleanups.push(() => socket.destroy());
  });
}

// What the server sent, once it has closed the connection.
function everythingSent(socket) {
  return new Promise((resolve) => {
    let data = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => { data += chunk; });
    socket.once('close', () => resolve(data));
  });
}

// The server's exit, or null if it is still running after `ms`.
function exitWithin(server, ms) {
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  return Promise.race([server.exited, timeout]).finally(() => clearTimeout(timer));
}

// The start of a request that never ends: the headers are not finished, so the
// server can only wait for the rest. Unlike an idle keep-alive connection, Node
// does not count this as idle.
const NEVER_FINISHES = 'GET /health HTTP/1.1\r\nHost: localhost\r\n';

for (const signal of ['SIGTERM', 'SIGINT']) {
  test(`${signal} stops an idle server at once: exit 0, and a line in the log`, OPTIONS, async () => {
    const server = await start();
    try {
      server.child.kill(signal);
      const exit = await exitWithin(server, 5000);
      assert.deepEqual(exit, { code: 0, signal: null }, `did not exit cleanly:\n${server.output}`);
      assert.match(server.output, new RegExp(`${signal} signal received: closing HTTP server`));
    } finally {
      stop(server);
    }
  });
}

test('an idle keep-alive connection does not hold the shutdown up', OPTIONS, async () => {
  // Node 18 leaves an idle keep-alive connection open until its own timeout
  // (5 seconds), and server.close() waits for it. Newer Node closes it for you,
  // so this is only a test of the code on 18.
  const server = await start();
  const agent = new http.Agent({ keepAlive: true });
  server.cleanups.push(() => agent.destroy());
  try {
    await new Promise((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port: server.port, path: '/health', agent }, (res) => {
          assert.equal(res.statusCode, 200);
          res.resume();
          res.once('end', resolve);
        })
        .once('error', reject);
    });
    // The agent now holds that connection open, idle.

    server.child.kill('SIGTERM');
    const exit = await exitWithin(server, 2500);
    assert.deepEqual(exit, { code: 0, signal: null }, `still waiting on the idle connection:\n${server.output}`);
  } finally {
    stop(server);
  }
});

test('a request in flight is answered before the server exits', OPTIONS, async () => {
  const server = await start();
  try {
    const socket = await connect(server);
    const sent = everythingSent(socket);
    // The headers, and half of the body they promise: the server is mid-request.
    socket.write(
      'POST /nowhere HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n' +
      'Content-Type: application/x-www-form-urlencoded\r\nContent-Length: 10\r\n\r\nabcde'
    );
    await sleep(300);

    server.child.kill('SIGTERM');
    await sleep(500);
    assert.equal(server.exit, null, `the server left while a request was open:\n${server.output}`);

    socket.write('fghij');
    const reply = await Promise.race([sent, sleep(5000).then(() => '')]);
    assert.match(reply, /^HTTP\/1\.1 404 /, `the open request was not answered. Got: ${JSON.stringify(reply.slice(0, 80))}`);

    const exit = await exitWithin(server, 5000);
    assert.deepEqual(exit, { code: 0, signal: null }, `did not exit cleanly after the reply:\n${server.output}`);
  } finally {
    stop(server);
  }
});

test('a connection that never finishes its request is cut off after SHUTDOWN_GRACE_MS', OPTIONS, async () => {
  const server = await start({ SHUTDOWN_GRACE_MS: '400' });
  try {
    const socket = await connect(server);
    socket.write(NEVER_FINISHES);
    await sleep(300);

    const signalled = Date.now();
    server.child.kill('SIGTERM');
    const exit = await exitWithin(server, 5000);
    assert.deepEqual(exit, { code: 1, signal: null }, `expected exit 1 after the grace period:\n${server.output}`);
    assert.match(server.output, /exiting anyway/);
    // Not at once: the connection was given its time first.
    assert.ok(Date.now() - signalled >= 300, `gave up after only ${Date.now() - signalled}ms`);
  } finally {
    stop(server);
  }
});

test('a second signal exits at once', OPTIONS, async () => {
  const server = await start({ SHUTDOWN_GRACE_MS: '60000' });
  try {
    const socket = await connect(server);
    socket.write(NEVER_FINISHES);
    await sleep(300);

    server.child.kill('SIGTERM');
    await sleep(500);
    assert.equal(server.exit, null, 'the first signal should wait for the open connection');

    server.child.kill('SIGTERM');
    const exit = await exitWithin(server, 3000);
    assert.deepEqual(exit, { code: 1, signal: null }, `the second signal did not end it:\n${server.output}`);
    assert.match(server.output, /signal received again: exiting now/);
  } finally {
    stop(server);
  }
});

test('an unusable SHUTDOWN_GRACE_MS falls back to the default, not to cutting connections at once', OPTIONS, async () => {
  // Zero, a negative number, NaN and Infinity would each make setTimeout fire
  // after about a millisecond. Run together, since each waits a moment.
  await Promise.all(['soon', '-5', '0', 'Infinity'].map(async (value) => {
    const server = await start({ SHUTDOWN_GRACE_MS: value });
    try {
      const socket = await connect(server);
      socket.write(NEVER_FINISHES);
      await sleep(300);

      server.child.kill('SIGTERM');
      await sleep(1200);
      assert.equal(server.exit, null, `SHUTDOWN_GRACE_MS=${value} cut the open connection off at once:\n${server.output}`);
    } finally {
      stop(server);
    }
  }));
});
