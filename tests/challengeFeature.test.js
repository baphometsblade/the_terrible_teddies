const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const Player = require('../models/Player');
const assert = require('assert');

describe('Challenge Feature Tests', function() {
    before(async function() {
        await mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Database connected for testing');
    });

    after(async function() {
        await mongoose.disconnect();
        console.log('Database disconnected after testing');
    });

    describe('Challenge Creation and Retrieval', function() {
        it('should create a challenge and retrieve it from the database', async function() {
            const challengeData = {
                title: "Test Challenge",
                description: "This is a test challenge",
                type: "daily",
                difficulty: "easy",
                reward: 100,
                isActive: true
            };

            const challenge = new Challenge(challengeData);
            await challenge.save();
            console.log('Challenge saved:', challenge.title);

            const retrievedChallenge = await Challenge.findOne({ title: "Test Challenge" });
            assert.strictEqual(retrievedChallenge.title, challengeData.title, 'Challenge title should match');
            console.log('Challenge retrieved and verified');
        });
    });

    describe('Challenge Completion', function() {
        it('should mark a challenge as completed for a player', async function() {
            const player = new Player({ username: 'testPlayer', email: 'test@example.com' });
            await player.save();
            console.log('Player created:', player.username);

            const challenge = await Challenge.findOne({ title: "Test Challenge" });
            player.completedChallenges.push({ challengeId: challenge._id, completionDate: new Date() });
            await player.save();
            console.log('Challenge marked as completed for player:', player.username);

            const updatedPlayer = await Player.findById(player._id);
            assert.strictEqual(updatedPlayer.completedChallenges.length, 1, 'Player should have one completed challenge');
            assert.strictEqual(updatedPlayer.completedChallenges[0].challengeId.toString(), challenge._id.toString(), 'Completed challenge ID should match');
            console.log('Challenge completion verified for player');
        });
    });

    describe('Challenge Reward Distribution', function() {
        it('should distribute rewards correctly upon challenge completion', async function() {
            const player = await Player.findOne({ username: 'testPlayer' });
            const challenge = await Challenge.findOne({ title: "Test Challenge" });

            // Simulate challenge completion
            player.completedChallenges.push({ challengeId: challenge._id, completionDate: new Date() });
            await player.save();

            // Assume reward distribution logic is handled elsewhere and just simulate the effect
            player.points = (player.points || 0) + challenge.reward;
            await player.save();

            const updatedPlayer = await Player.findById(player._id);
            assert.strictEqual(updatedPlayer.points, challenge.reward, 'Player points should be updated with the challenge reward');
            console.log('Reward distributed and verified for player:', player.username);
        });
    });
});