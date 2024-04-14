// services/combat/healthManager.js

const combatEvents = require('./combatEvents');

class HealthManager {
  adjustHealth(character, healthChange) {
    try {
      if (!character || typeof character.health !== 'number') {
        throw new Error('Invalid character or character health not a number');
      }

      character.health += healthChange;
      character.health = Math.max(character.health, 0); // Health should not go below 0

      // Emit an event after health is adjusted
      combatEvents.emit('healthChanged', {
        characterId: character.id,
        newHealth: character.health,
      });

      console.log(`Health adjusted for character ${character.id}, new health: ${character.health}`);
      return character.health;
    } catch (error) {
      console.error('Error adjusting health:', error.message, error.stack);
      throw error; // Rethrow the error after logging
    }
  }
}

module.exports = HealthManager;