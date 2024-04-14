// gameLogic.js

const Teddy = require('./models/Teddy');
const Player = require('./models/Player');
const { EXPERIENCE_BASE, RARITY_MULTIPLIER, LEVEL_UP_BASE } = require('./constants');

// Function to load teddies for a player's lineup from the database
async function loadTeddiesByIds(teddyIds) {
    try {
        const teddies = await Teddy.find({ '_id': { $in: teddyIds } });
        console.log('Loaded teddies for lineup:', teddies.map(teddy => teddy.name));
        return teddies;
    } catch (error) {
        console.error('Error loading teddies:', error.message, error.stack);
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
        throw error;
    }
}

module.exports = {
    loadTeddiesByIds,
    saveTeddyProgress
};