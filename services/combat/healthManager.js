const combatEvents = require('./combatEvents');

class HealthManager {
  constructor() {
    combatEvents.on('healthChange', (character, change) => this.adjustHealth(character, change));
  }

  adjustHealth(character, change) {
    try {
      character.health -= change;
      if (character.health < 0) {
        character.health = 0;
        console.log(`Health adjusted for ${character.name}, health is now 0 as it went below 0.`);
      } else if (character.health > character.maxHealth) {
        character.health = character.maxHealth;
        console.log(`Health adjusted for ${character.name}, health is now set to maxHealth as it exceeded the limit.`);
      } else {
        console.log(`Health adjusted for ${character.name}, new health: ${character.health}`);
      }
      combatEvents.emit('healthAdjusted', character);
    } catch (error) {
      console.error('Error adjusting health:', error.message, error.stack);
    }
  }
}

module.exports = HealthManager;