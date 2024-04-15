// damageManager.js

class DamageManager {
  calculateDamage(attacker, defender) {
    try {
      const damage = attacker.attackDamage; // Base damage from attacker
      console.log(`${attacker.name} attacks ${defender.name} for ${damage} damage.`);
      return damage;
    } catch (error) {
      console.error('Error calculating damage:', error.message, error.stack);
      throw error; // Rethrow the error after logging
    }
  }
}

module.exports = DamageManager;