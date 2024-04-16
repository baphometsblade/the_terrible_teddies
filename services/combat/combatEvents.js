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
      // Error handling should be implemented in the method this event calls
    });

    this.on('attack', (attacker, defender) => {
      console.log(`Event 'attack' triggered: ${attacker.name} attacks ${defender.name}`);
      // Error handling should be implemented in the method this event calls
    });

    this.on('specialMove', (attacker, defender, move) => {
      console.log(`Event 'specialMove' triggered: ${attacker.name} uses ${move} on ${defender.name}`);
      // Error handling should be implemented in the method this event calls
    });

    this.on('aiMove', (aiTeddy, playerTeddy) => {
      console.log(`Event 'aiMove' triggered: AI decides move for ${aiTeddy.name}`);
      // Error handling should be implemented in the method this event calls
    });

    this.on('battleStart', (playerTeddy, aiTeddy) => {
      console.log(`Event 'battleStart' triggered: Battle started between ${playerTeddy.name} and ${aiTeddy.name}`);
      // Error handling should be implemented in the method this event calls
    });
  }
}

const combatEvents = new CombatEvents();

module.exports = combatEvents;