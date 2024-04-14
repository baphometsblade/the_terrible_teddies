const combatEvents = require('./combatEvents');

class DamageManager {
  constructor() {}

  calculateDamage(attacker, defender) {
    try {
      const damage = attacker.attackDamage; // Basic damage calculation, can be expanded with more complex logic
      console.log(`DamageManager: Calculating damage. Attacker: ${attacker.name}, Defender: ${defender.name}, Damage: ${damage}`);
      
      // Emit an event after calculating damage
      combatEvents.emit('damageCalculated', {
        attackerId: attacker.id,
        defenderId: defender.id,
        damage: damage
      });

      return damage;
    } catch (error) {
      console.error('DamageManager: Error calculating damage:', error.message, error.stack);
      throw error; // Rethrow the error after logging
    }
  }
}

module.exports = DamageManager;