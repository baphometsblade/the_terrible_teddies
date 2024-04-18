const combatEvents = require('./combatEvents');

class AIDecisionMaker {
  constructor() {
    // Registering AI decision maker to listen for the "decideMove" event
    combatEvents.on('decideMove', (aiTeddy, playerTeddy) => this.decideMove(aiTeddy, playerTeddy));
  }

  decideMove(aiTeddy, playerTeddy) {
    try {
      // Basic AI logic for decision making
      let move = { special: false, name: '' };
      // Use special move if player's health is low or as a finishing move
      if ((playerTeddy.health < 30) || (aiTeddy.attackDamage >= playerTeddy.health)) {
        move.special = true;
        move.name = aiTeddy.specialMove;
        console.log(`AI Decision: Using special move ${move.name} by ${aiTeddy.name} on ${playerTeddy.name}`);
        combatEvents.emit('specialMove', aiTeddy, playerTeddy, move.name);
      } else {
        // Default to attack if none of the above conditions are met
        console.log(`AI Decision: Attacking with ${aiTeddy.name} on ${playerTeddy.name}`);
        combatEvents.emit('attack', aiTeddy, playerTeddy);
      }
      return move;
    } catch (error) {
      console.error('Error in AIDecisionMaker.decideMove:', error.message, error.stack);
      combatEvents.emit('error', `Error in AIDecisionMaker.decideMove: ${error.message}`, error.stack);
      return { special: false, name: 'defaultAttack' }; // Default to attack if there's an error
    }
  }
}

module.exports = AIDecisionMaker;