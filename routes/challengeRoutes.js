const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Player = require('../models/Player');
const mongoose = require('mongoose');
const challengeService = require('../services/challengeService');
const { isAuthenticated } = require('./middleware/authMiddleware');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Route to retrieve active challenges
router.get('/active', async (req, res) => {
    try {
        const activeChallenges = await Challenge.find({ isActive: true });
        console.log('Retrieved active challenges');
        res.json(activeChallenges);
    } catch (error) {
        console.error('Error retrieving active challenges:', error.message, error.stack);
        res.status(500).send('Failed to retrieve active challenges');
    }
});

// Route to mark a challenge as completed by a player
router.post('/complete', isAuthenticated, async (req, res) => {
    const { challengeId } = req.body;

    if (!isValidId(challengeId)) {
        return res.status(400).send('A valid challenge ID is required');
    }

    try {
        const challenge = await Challenge.findById(challengeId);
        if (!challenge || !challenge.isActive) {
            console.log('Challenge not found or not active:', challengeId);
            return res.status(404).send('Challenge not found or not active');
        }

        // The previous version passed req.session.userId (a User id) to
        // Player.findById - different collections, so this never matched.
        // Look the player up by the username on the session instead.
        const username = req.session.user && req.session.user.username;
        const player = username ? await Player.findOne({ username }) : null;
        if (!player) {
            console.log('No player profile for user:', req.session.userId);
            return res.status(404).send('No player profile found for your account');
        }

        // Utilize the challengeService to handle challenge completion logic
        const completionResult = await challengeService.completeChallenge(player, challenge);
        if (completionResult.alreadyCompleted) {
            console.log('Challenge already completed by player:', challengeId);
            return res.status(409).send('Challenge already completed');
        }

        console.log('Challenge marked as completed for player:', challengeId, player.username);

        res.send('Challenge completed successfully');
    } catch (error) {
        console.error('Error completing challenge:', error.message, error.stack);
        res.status(500).send('Failed to complete challenge');
    }
});

// Route to retrieve all challenges
router.get('/', async (req, res) => {
    try {
        const challenges = await Challenge.find({});
        const user = req.session.user; // Assuming user session is managed and user info is stored in session
        console.log('Retrieved all challenges');
        res.render('challenges', { challenges, user }); // Pass user to the view
    } catch (error) {
        console.error('Error retrieving challenges:', error.message, error.stack);
        res.status(500).send('Failed to retrieve challenges');
    }
});

module.exports = router;