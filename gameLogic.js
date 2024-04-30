// gameLogic.js
const Teddy = require('./models/Teddy');
const logger = require('./config/loggingConfig');

async function levelUpTeddy(teddyId, experiencePoints) {
  try {
    const teddy = await Teddy.findById(teddyId);
    if (!teddy) {
      throw new Error('Teddy not found');
    }

    // Add experience points to the teddy's current experience
    teddy.experience += experiencePoints;
    // Check if the teddy has enough experience points to level up
    while (teddy.experience >= 100) { // Assuming 100 XP needed to level up
      teddy.level += 1; // Increase teddy's level
      teddy.health += 10; // Increase health by 10 on each level up
      teddy.attackDamage += 5; // Increase attack by 5 on each level up
      teddy.experience -= 100; // Deduct 100 XP after each level up
      logger.info(`Teddy ${teddy.name} leveled up to level ${teddy.level}`);
    }

    await teddy.save();
    logger.info(`Teddy ${teddy.name} updated successfully with new level ${teddy.level}, health ${teddy.health}, and attack damage ${teddy.attackDamage}.`);
    return teddy;
  } catch (error) {
    logger.error('Error leveling up teddy:', error.message + ' ' + error.stack);
    throw error;
  }
}

module.exports = {
  levelUpTeddy
};