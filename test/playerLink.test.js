const test = require('node:test');
const assert = require('node:assert/strict');

const { currentPlayer } = require('../utils/currentPlayer');

// Minimal stand-in for the Player model. Enough to exercise the lookup
// branching without needing a live MongoDB.
function fakeModel(rows) {
  return {
    queries: [],
    async findOne(query) {
      this.queries.push(query);
      const [field, value] = Object.entries(query)[0];
      const hit = rows.find((r) => String(r[field]) === String(value));
      if (!hit) return null;
      return { ...hit, saved: false, async save() { this.saved = true; hit.user = this.user; } };
    }
  };
}

const sessionFor = (userId, username) => ({ session: { userId, user: { username } } });

test('currentPlayer resolves via the user reference', async () => {
  const model = fakeModel([{ _id: 'p1', user: 'u1', username: 'cuddula' }]);

  const found = await currentPlayer(sessionFor('u1', 'cuddula'), { model });

  assert.ok(found);
  assert.equal(found._id, 'p1');
  assert.deepEqual(model.queries[0], { user: 'u1' }, 'should try the reference first');
  assert.equal(model.queries.length, 1, 'should not need the username fallback');
});

test('currentPlayer falls back to username and writes the link back', async () => {
  // A profile from before the reference existed.
  const rows = [{ _id: 'p2', user: null, username: 'legacy' }];
  const model = fakeModel(rows);

  const found = await currentPlayer(sessionFor('u2', 'legacy'), { model });

  assert.ok(found, 'should still resolve via username');
  assert.equal(found._id, 'p2');
  assert.equal(found.saved, true, 'should persist the newly discovered link');
  assert.equal(rows[0].user, 'u2', 'link should be written back to the row');
  assert.deepEqual(model.queries, [{ user: 'u2' }, { username: 'legacy' }]);
});

test('currentPlayer does not steal a profile already claimed by another user', async () => {
  // Username matches, but the profile belongs to a different account.
  const rows = [{ _id: 'p3', user: 'someone-else', username: 'shared' }];
  const model = fakeModel(rows);

  const found = await currentPlayer(sessionFor('u3', 'shared'), { model });

  assert.equal(found.saved, false, 'must not overwrite an existing owner');
  assert.equal(rows[0].user, 'someone-else', 'original owner must be preserved');
});

test('currentPlayer returns null when the account has no profile', async () => {
  const model = fakeModel([]);
  assert.equal(await currentPlayer(sessionFor('u4', 'profileless'), { model }), null);
});

test('currentPlayer returns null without a session', async () => {
  const model = fakeModel([{ _id: 'p5', user: 'u5', username: 'x' }]);
  assert.equal(await currentPlayer({ session: {} }, { model }), null);
  assert.equal(await currentPlayer({}, { model }), null);
  assert.equal(await currentPlayer(null, { model }), null);
  assert.equal(model.queries.length, 0, 'should not query without a session');
});

test('currentPlayer returns null when session has a userId but no username', async () => {
  const model = fakeModel([{ _id: 'p6', user: null, username: 'orphan' }]);
  const found = await currentPlayer({ session: { userId: 'u6' } }, { model });
  assert.equal(found, null, 'no username means no safe fallback');
});
