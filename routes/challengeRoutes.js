const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Player = require('../models/Player');
const challengeService = require('../services/challengeService'); // Importing challenge service

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
router.post('/complete', async (req, res) => {
    const { challengeId } = req.body;
    const userId = req.session.userId; // Assumes user session is managed and userId is stored in session

    if (!challengeId) {
        console.log('Challenge ID not provided');
        return res.status(400).send('Challenge ID is required');
    }

    try {
        const challenge = await Challenge.findById(challengeId);
        if (!challenge || !challenge.isActive) {
            console.log('Challenge not found or not active:', challengeId);
            return res.status(404).send('Challenge not found or not active');
        }

        const player = await Player.findById(userId);
        if (!player) {
            console.log('Player not found:', userId);
            return res.status(404).send('Player not found');
        }

        // Utilize the challengeService to handle challenge completion logic
        const completionResult = await challengeService.completeChallenge(player, challenge);
        if (completionResult.alreadyCompleted) {
            console.log('Challenge already completed by player:', challengeId);
            return res.status(409).send('Challenge already completed');
        }

        console.log('Challenge marked as completed for player:', challengeId, userId);

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