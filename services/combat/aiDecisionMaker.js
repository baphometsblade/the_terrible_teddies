const combatEvents = require('./combatEvents');

class AIDecisionMaker {
  constructor() {
    // Subscribe to AI decision events
    combatEvents.on('decideMove', (playerTeddy, opponentTeddy) => {
      try {
        this.decideMove(playerTeddy, opponentTeddy);
      } catch (error) {
        console.error('Error in AIDecisionMaker event listener:', error.message, error.stack);
        this.emit('error', error);
      }
    });
  }

  decideMove(playerTeddy, opponentTeddy) {
    try {
      // Basic AI decision logic
      if (playerTeddy.currentHealth < playerTeddy.health * 0.3) {
        // If player's teddy health is below 30%, use special move
        console.log(`AI Decision: Player teddy's health is low, using special move.`);
        combatEvents.emit('specialMove', {
          attacker: playerTeddy,
          defender: opponentTeddy,
          move: 'specialMove'
        });
      } else {
        // Otherwise, use a regular attack
        console.log(`AI Decision: Player teddy's health is sufficient, using regular attack.`);
        combatEvents.emit('attack', {
          attacker: playerTeddy,
          defender: opponentTeddy
        });
      }
    } catch (error) {
      console.error('Error in AIDecisionMaker.decideMove:', error.message, error.stack);
      this.emit('error', error);
    }
  }
}

module.exports = AIDecisionMaker;