const combatEvents = require('./combatEvents');

class AIDecisionMaker {
  constructor() {
    // Listeners can be registered here if needed in the future
  }

  decideMove(aiTeddy, playerTeddy) {
    try {
      // Basic AI logic for decision making
      let move = { special: false, name: '' };
      // Use special move if player's health is low or as a finishing move
      if ((playerTeddy.health < 30) || (aiTeddy.attackDamage >= playerTeddy.health)) {
        move.special = true;
        move.name = aiTeddy.specialMove;
        combatEvents.emit('specialMove', aiTeddy, playerTeddy, move.name);
      } else {
        // Default to attack if none of the above conditions are met
        combatEvents.emit('attack', aiTeddy, playerTeddy);
      }
      return move;
    } catch (error) {
      combatEvents.emit('error', `Error in AIDecisionMaker.decideMove: ${error.message}`, error.stack);
      return { special: false, name: 'defaultAttack' }; // Default to attack if there's an error
    }
  }
}

module.exports = AIDecisionMaker;