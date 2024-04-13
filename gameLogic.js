// gameLogic.js

const Teddy = require('./models/Teddy');
const Player = require('./models/Player');

// Constants
const EXPERIENCE_BASE = 10;
const RARITY_MULTIPLIER = {
    'Common': 1,
    'Uncommon': 1.5,
    'Rare': 2,
    'Legendary': 3,
    // Adjust rarity multipliers as needed for game balance
    'Mythic': 4
};
const LEVEL_UP_BASE = 20; // Adjust base experience required for leveling up as needed for game balance

// Function to load teddies for a player's lineup from the database
async function loadTeddiesByIds(teddyIds) {
    try {
        const teddies = await Teddy.find({ '_id': { $in: teddyIds } });
        console.log('Loaded teddies for lineup:', teddies.map(teddy => teddy.name));
        return teddies;
    } catch (error) {
        console.error('Error loading teddies:', error.message, error.stack);
        // Rethrow the error to be handled by the calling function
        throw error;
    }
}

// Function to save teddy health and other attributes changes to the database
async function saveTeddyProgress(teddy) {
    try {
        const updateData = {
            health: teddy.currentHealth
            // Other attributes can be updated here if needed
        };
        await Teddy.findByIdAndUpdate(teddy._id, updateData);
        console.log(`Saved teddy progress for ${teddy.name}`);
    } catch (error) {
        console.error('Error saving teddy progress:', error.message, error.stack);
        // Rethrow the error to be handled by the calling function
        throw error;
    }
}

// Function to calculate experience points earned after a battle
function calculateExperiencePoints(playerTeddy, opponentTeddy) {
    const experiencePoints = EXPERIENCE_BASE * (RARITY_MULTIPLIER[opponentTeddy.rarity] || 1);
    return experiencePoints;
}

// Function to determine if a player has leveled up based on experience points
function checkForLevelUp(player) {
    const experienceForNextLevel = player.level * LEVEL_UP_BASE;
    if (player.experiencePoints >= experienceForNextLevel) {
        player.level++;
        // Subtract the experience points used to level up
        player.experiencePoints -= experienceForNextLevel;
        // Call function to handle rewards for leveling up
        handleLevelUpRewards(player);
        console.log(`Player leveled up to level ${player.level}`);
    }
    return player;
}

// Function to handle rewards when a player levels up
function handleLevelUpRewards(player) {
    // Implement actual rewards logic here
    // Example: improve teddy stats, unlock new teddies, or award in-game currency
    player.currency = (player.currency || 0) + 100; // Award in-game currency as a reward
    console.log(`Rewards given for reaching level ${player.level}`);
    // Additional rewards logic can be implemented here
}

module.exports = {
    loadTeddiesByIds,
    saveTeddyProgress,
    calculateExperiencePoints,
    checkForLevelUp,
    handleLevelUpRewards
};