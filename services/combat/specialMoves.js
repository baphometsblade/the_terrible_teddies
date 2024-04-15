const combatEvents = require('./combatEvents');

class SpecialMoves {
  applySpecialMove(attacker, defender, move) {
    try {
      console.log(`Applying special move: ${move}`);
      switch (move) {
        case 'doubleDamage':
          console.log(`${attacker.name} is using double damage on ${defender.name}`);
          combatEvents.emit('healthChange', defender, -attacker.attackDamage * 2);
          break;
        case 'heal':
          console.log(`${attacker.name} is healing`);
          combatEvents.emit('healthChange', attacker, 20);
          break;
        default:
          console.log(`${attacker.name} is using a default special move on ${defender.name}`);
          combatEvents.emit('healthChange', defender, -20);
          break;
      }
    } catch (error) {
      console.error('Error applying special move:', error.message, error.stack);
      combatEvents.emit('error', error);
    }
  }
}

module.exports = SpecialMoves;