const { test, before, after, describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const Player = require('../models/Player');

// These are integration tests and need a real MongoDB instance.
//
// They deliberately use TEST_DATABASE_URL, not DATABASE_URL: the previous
// version of this file connected to the production database and wrote test
// records into it. Set TEST_DATABASE_URL to a throwaway database to run them.
const TEST_DB = process.env.TEST_DATABASE_URL;

describe('Challenge feature (integration)', { skip: TEST_DB ? false : 'TEST_DATABASE_URL not set' }, () => {
  before(async () => {
    await mongoose.connect(TEST_DB);
  });

  after(async () => {
    await Challenge.deleteMany({ title: 'Test Challenge' });
    await Player.deleteMany({ username: 'testPlayer' });
    await mongoose.disconnect();
  });

  it('creates a challenge and reads it back', async () => {
    await Challenge.create({
      title: 'Test Challenge',
      description: 'This is a test challenge',
      type: 'daily',
      difficulty: 'easy',
      reward: 100,
      isActive: true
    });

    const found = await Challenge.findOne({ title: 'Test Challenge' });
    assert.ok(found, 'challenge should be retrievable');
    assert.strictEqual(found.title, 'Test Challenge');
  });

  it('records a completed challenge against a player', async () => {
    const player = await Player.create({ username: 'testPlayer', email: 'test@example.com' });
    const challenge = await Challenge.findOne({ title: 'Test Challenge' });

    player.completedChallenges.push({ challengeId: challenge._id, completionDate: new Date() });
    await player.save();

    const updated = await Player.findById(player._id);
    assert.strictEqual(updated.completedChallenges.length, 1);
    assert.strictEqual(
      updated.completedChallenges[0].challengeId.toString(),
      challenge._id.toString()
    );
  });

  // The former 'reward distribution' test asserted on `player.points`, but the
  // Player schema has no `points` field, so Mongoose silently dropped it and
  // the assertion could never pass. Reinstate this once reward balances are
  // actually modelled.
});
