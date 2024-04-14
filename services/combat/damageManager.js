const combatEvents = require('./combatEvents');

class DamageManager {
  calculateDamage(attacker, defender) {
    try {
      // Basic damage calculation, can be expanded with more complex logic
      const damage = attacker.attackDamage - (defender.defense || 0);
      console.log(`DamageManager: Calculating damage. Attacker: ${attacker.name}, Defender: ${defender.name}, Damage: ${damage}`);

      // Emit an event after calculating damage
      combatEvents.emit('damageCalculated', {
        attackerId: attacker._id, // Ensure the property name is consistent with the schema
        defenderId: defender._id, // Ensure the property name is consistent with the schema
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