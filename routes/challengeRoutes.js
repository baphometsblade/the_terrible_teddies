const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Player = require('../models/Player');

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

        // Check if the challenge is already completed by the player
        const alreadyCompleted = player.completedChallenges.some(c => c.challengeId.equals(challengeId));
        if (alreadyCompleted) {
            console.log('Challenge already completed by player:', challengeId);
            return res.status(409).send('Challenge already completed');
        }

        // Mark the challenge as completed
        player.completedChallenges.push({ challengeId: challenge._id, completionDate: new Date() });
        await player.save();
        console.log('Challenge marked as completed for player:', challengeId, userId);

        res.send('Challenge completed successfully');
    } catch (error) {
        console.error('Error completing challenge:', error.message, error.stack);
        res.status(500).send('Failed to complete challenge');
    }
});

module.exports = router;