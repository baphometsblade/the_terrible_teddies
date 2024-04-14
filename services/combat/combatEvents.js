const EventEmitter = require('events');

class CombatEmitter extends EventEmitter {
  constructor() {
    super();
    this.on('error', (error) => {
      console.error('Error event emitted in CombatEmitter:', error.message, error.stack);
    });

    // Event handlers for combat events
    this.on('healthChanged', (data) => {
      console.log(`Health changed event received for character ${data.characterId}, new health: ${data.newHealth}`);
      // Additional logic for healthChanged event can be added here
    });

    this.on('attack', (data) => {
      console.log(`Attack event received, attacker: ${data.attackerId}, defender: ${data.defenderId}, damage: ${data.damage}`);
      // Additional logic for attack event can be added here
    });

    this.on('specialMove', (data) => {
      console.log(`Special move event received, character: ${data.characterId}, move: ${data.move}`);
      // Additional logic for specialMove event can be added here
    });

    // Additional combat event handlers can be added here as needed
  }
}

const combatEvents = new CombatEmitter();

module.exports = combatEvents;