const HealthManager = require('./healthManager');
const DamageManager = require('./damageManager');
const SpecialMoves = require('./specialMoves');
const AIDecisionMaker = require('./aiDecisionMaker');
const combatEvents = require('./combatEvents');

class CombatSystem {
  constructor() {
    this.healthManager = new HealthManager();
    this.damageManager = new DamageManager();
    this.specialMoves = new SpecialMoves();
    this.aiDecisionMaker = new AIDecisionMaker();

    // Subscribe to health change events
    combatEvents.on('healthChanged', (data) => {
      try {
        // Update battle state with the new health
        this.updateBattleState(data.characterId, data.newHealth);
        // Trigger UI updates if necessary
        combatEvents.emit('battleStateUpdated', data);
      } catch (error) {
        console.error('Error handling healthChanged event:', error.message, error.stack);
      }
    });

    // Subscribe to attack events
    combatEvents.on('attack', (data) => {
      this.handleAttackEvent(data);
    });

    // Subscribe to special move events
    combatEvents.on('specialMove', (data) => {
      this.handleSpecialMoveEvent(data);
    });
  }

  updateBattleState(characterId, newHealth) {
    // Logic to update the battle state
    const character = this.battleState.characters.find(c => c.id === characterId);
    if (character) {
      character.currentHealth = newHealth;
      console.log(`Battle state updated for character ${characterId} with new health ${newHealth}`);
    } else {
      console.error(`Character with ID ${characterId} not found in battle state.`);
    }
  }

  handleAttackEvent(data) {
    // Logic to handle attack event
    const damage = this.damageManager.calculateDamage(data.attacker, data.defender);
    this.healthManager.adjustHealth(data.defender, -damage);
    console.log(`${data.attacker.name} attacked ${data.defender.name} for ${damage} damage.`);
  }

  handleSpecialMoveEvent(data) {
    // Logic to handle special move event
    this.specialMoves.applySpecialMove(data.attacker, data.defender, data.move);
    console.log(`${data.attacker.name} used special move ${data.move} on ${data.defender.name}.`);
  }

  // Other methods related to combat
}

module.exports = CombatSystem;