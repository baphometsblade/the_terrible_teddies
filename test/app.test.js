const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DEMO_MODE = 'true';
process.env.SESSION_SECRET = 'test-secret';

const { createApp } = require('../server');

test('createApp returns an Express app without requiring MongoDB', () => {
  const app = createApp();

  assert.equal(typeof app, 'function');
  assert.equal(typeof app.listen, 'function');
});

test('health endpoint responds in demo mode', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.demoMode, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('playable demo route returns HTML', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/play`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Terrible Teddies/);
    assert.match(body, /Fight With/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
