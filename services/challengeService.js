const moment = require('moment');
const lodash = require('lodash');
const Challenge = require('../models/Challenge');
const Player = require('../models/Player');

// Function to activate or deactivate challenges based on the current date
async function updateChallengeStatus() {
    try {
        const today = moment().startOf('day');
        const challenges = await Challenge.find();

        challenges.forEach(async (challenge) => {
            const isActive = (challenge.type === 'daily' && moment(challenge.createdAt).isSame(today, 'day')) ||
                             (challenge.type === 'weekly' && moment(challenge.createdAt).isSame(today, 'week'));

            if (challenge.isActive !== isActive) {
                challenge.isActive = isActive;
                await challenge.save();
                console.log(`Updated challenge status for ${challenge.title}: ${isActive ? 'Activated' : 'Deactivated'}`);
            }
        });
    } catch (error) {
        console.error('Error updating challenge statuses:', error.message, error.stack);
    }
}

// Function to calculate and distribute rewards to players upon completion of a challenge
async function distributeRewards(playerId, challengeId) {
    try {
        const player = await Player.findById(playerId);
        const challenge = await Challenge.findById(challengeId);

        if (!player || !challenge) {
            console.error('Player or challenge not found for distributing rewards.');
            return;
        }

        if (challenge.isActive && !player.completedChallenges.some(ch => ch.challengeId.equals(challengeId))) {
            player.completedChallenges.push({ challengeId: challenge._id, completionDate: new Date() });
            player.save();
            console.log(`Distributed reward of ${challenge.reward} to player ${player.username} for completing challenge ${challenge.title}`);
        } else {
            console.log('Challenge is not active or already completed by the player.');
        }
    } catch (error) {
        console.error('Error distributing rewards:', error.message, error.stack);
    }
}

module.exports = {
    updateChallengeStatus,
    distributeRewards
};