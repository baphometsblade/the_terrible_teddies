const { EventEmitter } = require('events');

class CombatEvents extends EventEmitter {
  constructor() {
    super();
    this.on('error', (error) => {
      console.error('Error in CombatEvents:', error.message, error.stack);
    });

    // Registering combat-related events with their handlers
    this.on('healthChange', (character, change) => {
      console.log(`Event 'healthChange' triggered for ${character.name} with change: ${change}`);
      // Implementing method call for health change
      character.adjustHealth(change);
    });

    this.on('attack', (attacker, defender) => {
      console.log(`Event 'attack' triggered: ${attacker.name} attacks ${defender.name}`);
      // Implementing method call for attack
      const damage = attacker.calculateDamage(defender);
      defender.adjustHealth(-damage);
    });

    this.on('specialMove', (attacker, defender, move) => {
      console.log(`Event 'specialMove' triggered: ${attacker.name} uses ${move} on ${defender.name}`);
      // Implementing method call for special move
      attacker.applySpecialMove(defender, move);
    });

    this.on('aiMove', (aiTeddy, playerTeddy) => {
      console.log(`Event 'aiMove' triggered: AI decides move for ${aiTeddy.name}`);
      // Implementing AI decision making
      const move = aiTeddy.decideMove(playerTeddy);
      this.emit(move, aiTeddy, playerTeddy);
    });

    this.on('battleStart', (playerTeddy, aiTeddy) => {
      console.log(`Event 'battleStart' triggered: Battle started between ${playerTeddy.name} and ${aiTeddy.name}`);
      // Implementing battle start logic
      this.emit('aiMove', aiTeddy, playerTeddy); // Example of triggering an AI move at the start
    });
  }
}

const combatEvents = new CombatEvents();

module.exports = combatEvents;