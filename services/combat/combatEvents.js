const { EventEmitter } = require('events');

class CombatEvents extends EventEmitter {
  constructor() {
    super();

    this.on('attack', (attacker, defender) => {
      console.log(`${attacker.name} attacks ${defender.name}.`);
      // Additional logic to handle attack event goes here
    });

    this.on('specialMove', (attacker, defender, moveName) => {
      console.log(`${attacker.name} uses ${moveName} on ${defender.name}.`);
      // Additional logic to handle special move event goes here
    });

    this.on('healthChange', (character, amount) => {
      console.log(`${character.name}'s health changes by ${amount}.`);
      // Additional logic to handle health change event goes here
    });

    this.on('battleStart', (playerTeddy, aiTeddy) => {
      console.log(`Battle starts between ${playerTeddy.name} and ${aiTeddy.name}.`);
      // Additional logic to handle battle start event goes here
    });

    // Reintroducing error handling for robustness
    this.on('error', (error) => {
      console.error('Error in CombatEvents:', error);
    });

    // Reintroducing AI decision-making event for completeness
    this.on('aiMove', (aiTeddy, playerTeddy) => {
      console.log(`AI ${aiTeddy.name} decides its move against ${playerTeddy.name}`);
      // Logic for AI to decide its move goes here
    });
  }
}

const combatEvents = new CombatEvents();

module.exports = combatEvents;