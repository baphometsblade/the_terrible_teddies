// gameLogic.js

const Teddy = require('./models/Teddy');
const { EXPERIENCE_BASE } = require('./constants');

// Function to update teddy's progression after a battle
async function updateTeddyProgression(teddyId, opponentLevel) {
  try {
    const teddy = await Teddy.findById(teddyId);
    if (!teddy) {
      console.error('Teddy not found with id:', teddyId);
      return;
    }
    // Calculate experience points gained from a battle
    const experiencePoints = EXPERIENCE_BASE * opponentLevel;
    teddy.addExperience(experiencePoints);
    if (teddy.checkLevelUp()) {
      teddy.applyLevelUp();
    }
    await teddy.save();
    console.log(`Teddy updated successfully with ${experiencePoints} experience points.`);
  } catch (err) {
    console.error('Error updating teddy progression:', err.message, err.stack);
  }
}

module.exports = {
  updateTeddyProgression
};