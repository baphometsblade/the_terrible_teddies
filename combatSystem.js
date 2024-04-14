const HealthManager = require('./services/combat/healthManager');
const DamageManager = require('./services/combat/damageManager');
const SpecialMoves = require('./services/combat/specialMoves');
const AIDecisionMaker = require('./services/combat/aiDecisionMaker');
const combatEvents = require('./services/combat/combatEvents');

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
      try {
        this.handleAttackEvent(data);
      } catch (error) {
        console.error('Error handling attack event:', error.message, error.stack);
      }
    });

    // Subscribe to special move events
    combatEvents.on('specialMove', (data) => {
      try {
        this.handleSpecialMoveEvent(data);
      } catch (error) {
        console.error('Error handling specialMove event:', error.message, error.stack);
      }
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