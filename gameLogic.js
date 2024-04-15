// gameLogic.js

const Teddy = require('./models/Teddy');
const { EXPERIENCE_BASE, LEVEL_UP_BASE } = require('./constants');

// Function to calculate experience points gained from a battle
function calculateExperiencePoints(teddy, opponentLevel) {
  // Simple example calculation, can be expanded to consider various factors
  const experienceGained = EXPERIENCE_BASE * opponentLevel;
  return experienceGained;
}

// Function to handle teddy level up after battle
async function handleTeddyLevelUp(teddy, opponentLevel) {
  try {
    const experienceGained = calculateExperiencePoints(teddy, opponentLevel);
    const levelUps = await teddy.addExperience(experienceGained);
    if (levelUps > 0) {
      console.log(`${teddy.name} leveled up! Total level-ups: ${levelUps}`);
    } else {
      console.log(`${teddy.name} gained ${experienceGained} experience points.`);
    }
    await teddy.save(); // Save the changes to the database
  } catch (error) {
    console.error('Error handling teddy level up:', error.message, error.stack);
    throw error;
  }
}

module.exports = {
    handleTeddyLevelUp
};