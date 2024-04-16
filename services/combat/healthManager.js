class HealthManager {
  constructor() {}

  adjustHealth(character, change) {
    try {
      character.health -= change;
      if (character.health < 0) {
        character.health = 0;
      } else if (character.health > character.maxHealth) {
        character.health = character.maxHealth;
      }
      console.log(`Health adjusted for ${character.name}, new health: ${character.health}`);
    } catch (error) {
      console.error('Error adjusting health:', error.message, error.stack);
    }
  }
}

module.exports = HealthManager;