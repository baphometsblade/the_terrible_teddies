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
    });

    this.on('damageDealt', (data) => {
      console.log(`Damage dealt event received, attacker: ${data.attackerId}, defender: ${data.defenderId}, damage: ${data.damage}`);
    });

    this.on('specialMoveExecuted', (data) => {
      console.log(`Special move executed event received, character: ${data.characterId}, move: ${data.move}`);
    });

    this.on('aiMoveDecided', (data) => {
      console.log(`AI move decided event received, character: ${data.characterId}, move: ${data.move}`);
    });

    // Additional combat event handlers can be added here as needed
  }
}

const combatEvents = new CombatEmitter();

module.exports = combatEvents;