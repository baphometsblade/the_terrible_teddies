const express = require('express');
const router = express.Router();
const Challenge = require('../../models/Challenge');
const Player = require('../../models/Player');
const { ensureAuthenticated } = require('../../middleware/authMiddleware');

// Retrieve all active challenges
router.get('/active', ensureAuthenticated, async (req, res) => {
    try {
        const challenges = await Challenge.find({ isActive: true });
        res.json(challenges);
    } catch (error) {
        console.error('Error fetching active challenges:', error.message, error.stack);
        res.status(500).send('Failed to retrieve active challenges.');
    }
});

// Mark a challenge as completed for a player
router.post('/complete/:challengeId', ensureAuthenticated, async (req, res) => {
    const { challengeId } = req.params;
    const { userId } = req.session;

    try {
        const challenge = await Challenge.findById(challengeId);
        if (!challenge || !challenge.isActive) {
            return res.status(404).send('Challenge not found or is not active.');
        }

        const player = await Player.findOne({ userId });
        if (!player) {
            return res.status(404).send('Player not found.');
        }

        // Add challenge to player's completed challenges if not already completed
        if (!player.completedChallenges.includes(challengeId)) {
            player.completedChallenges.push(challengeId);
            await player.save();
            res.send('Challenge marked as completed.');
        } else {
            res.status(400).send('Challenge already completed by this player.');
        }
    } catch (error) {
        console.error('Error completing challenge:', error.message, error.stack);
        res.status(500).send('Failed to mark challenge as completed.');
    }
});

module.exports = router;