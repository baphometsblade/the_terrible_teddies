const combatEvents = require('./combatEvents');

class SpecialMoves {
  constructor() {}

  applySpecialMove(attacker, defender, move) {
    try {
      console.log(`Applying special move: ${move}`);
      let eventData = {
        attackerId: attacker.id,
        defenderId: defender.id,
        move: move
      };

      switch (move) {
        case 'doubleDamage':
          console.log(`${attacker.name} is using double damage on ${defender.name}`);
          defender.currentHealth -= attacker.attackDamage * 2;
          eventData.damageDealt = attacker.attackDamage * 2;
          combatEvents.emit('specialMoveExecuted', eventData);
          break;
        case 'heal':
          console.log(`${attacker.name} is healing`);
          const healAmount = 20;
          attacker.currentHealth += healAmount;
          // Ensure the health does not exceed the maximum health
          if (attacker.currentHealth > attacker.health) {
            attacker.currentHealth = attacker.health;
          }
          eventData.healAmount = healAmount;
          combatEvents.emit('specialMoveExecuted', eventData);
          break;
        default:
          console.log(`${attacker.name} is using a default special move on ${defender.name}`);
          const defaultDamage = 20;
          defender.currentHealth -= defaultDamage;
          eventData.damageDealt = defaultDamage;
          combatEvents.emit('specialMoveExecuted', eventData);
          break;
      }

      // Emit an event after health is adjusted
      combatEvents.emit('healthChanged', {
        characterId: defender.id,
        newHealth: defender.currentHealth
      });

      if (move === 'heal') {
        combatEvents.emit('healthChanged', {
          characterId: attacker.id,
          newHealth: attacker.currentHealth
        });
      }
    } catch (error) {
      console.error('Error applying special move:', error.message, error.stack);
      combatEvents.emit('error', { error: error, message: 'Error applying special move' });
    }
  }
}

module.exports = SpecialMoves;