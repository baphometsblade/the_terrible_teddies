// gameLogic.js

const Teddy = require('./models/Teddy');
const Player = require('./models/Player'); // Import Player model to handle player details
const { EXPERIENCE_BASE } = require('./constants');
const mongoose = require('mongoose');

// Function to update teddy's progression after a battle
async function updateTeddyProgression(teddyId, opponentLevel) {
  if (!mongoose.Types.ObjectId.isValid(teddyId)) {
    console.error(`Invalid Teddy ID: ${teddyId}`);
    return;
  }

  try {
    const teddy = await Teddy.findById(teddyId);
    if (!teddy) {
      console.error(`Teddy not found with id: ${teddyId}`);
      return;
    }
    // Calculate experience points gained from a battle
    const experiencePoints = EXPERIENCE_BASE * opponentLevel;
    teddy.addExperience(experiencePoints);
    // Check if the teddy has enough experience to level up
    if (teddy.checkLevelUp()) {
      teddy.applyLevelUp();
    }
    await teddy.save();
    console.log(`Teddy updated successfully with ${experiencePoints} experience points.`);
  } catch (err) {
    console.error('Error updating teddy progression:', err.message, err.stack);
  }
}

// Function to ensure player profile exists for a given userId
async function ensurePlayerProfile(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error(`Invalid User ID: ${userId}`);
    return;
  }

  try {
    let player = await Player.findOne({ userId: userId });
    if (!player) {
      player = await Player.create({ userId: userId, experiencePoints: 0, level: 1, unlockedTeddies: [], currency: 100 }); // Initialized with default values
      console.log(`Created new player profile for userId: ${userId}`);
    }
    return player;
  } catch (err) {
    console.error('Error ensuring player profile:', err.message, err.stack);
  }
}

module.exports = {
  updateTeddyProgression,
  ensurePlayerProfile
};