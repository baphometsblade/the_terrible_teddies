// combatSystem.js

const { HealthManager } = require('./services/combat/healthManager');
const { DamageManager } = require('./services/combat/damageManager');
const { SpecialMoves } = require('./services/combat/specialMoves');
const { AIDecisionMaker } = require('./services/combat/aiDecisionMaker');
const combatEvents = require('./services/combat/combatEvents');

class CombatSystem {
  constructor() {
    this.healthManager = new HealthManager();
    this.damageManager = new DamageManager();
    this.specialMoves = new SpecialMoves();
    this.aiDecisionMaker = new AIDecisionMaker();
    this.setupEventListeners();
  }

  setupEventListeners() {
    combatEvents.on('healthChange', (character, change) => {
      try {
        this.healthManager.adjustHealth(character, change);
        console.log(`Health adjusted for ${character.name}, change: ${change}`);
      } catch (error) {
        console.error('Error handling healthChange event:', error.message, error.stack);
      }
    });

    combatEvents.on('attack', (attacker, defender) => {
      try {
        const damage = this.damageManager.calculateDamage(attacker, defender);
        combatEvents.emit('healthChange', defender, -damage);
        console.log(`Attack event: ${attacker.name} attacks ${defender.name} for ${damage} damage`);
      } catch (error) {
        console.error('Error handling attack event:', error.message, error.stack);
      }
    });

    combatEvents.on('specialMove', (attacker, defender, move) => {
      try {
        this.specialMoves.applySpecialMove(attacker, defender, move);
        console.log(`Special move event: ${attacker.name} uses ${move} on ${defender.name}`);
      } catch (error) {
        console.error('Error handling specialMove event:', error.message, error.stack);
      }
    });

    combatEvents.on('aiMove', (aiTeddy, playerTeddy) => {
      try {
        const move = this.aiDecisionMaker.decideMove(aiTeddy, playerTeddy);
        if (move.special) {
          combatEvents.emit('specialMove', aiTeddy, playerTeddy, move.name);
        } else {
          combatEvents.emit('attack', aiTeddy, playerTeddy);
        }
        console.log(`AI move event: ${aiTeddy.name} decides on ${move.special ? 'special move' : 'attack'}`);
      } catch (error) {
        console.error('Error handling aiMove event:', error.message, error.stack);
      }
    });

    combatEvents.on('battleStart', (playerTeddy, aiTeddy) => {
      console.log('Battle started between', playerTeddy.name, 'and', aiTeddy.name);
    });
  }

  initiateBattle(playerTeddy, aiTeddy) {
    combatEvents.emit('battleStart', playerTeddy, aiTeddy);
    console.log(`Battle initiated between ${playerTeddy.name} and ${aiTeddy.name}`);
  }

  playerAttack(playerTeddy, aiTeddy) {
    combatEvents.emit('attack', playerTeddy, aiTeddy);
    console.log(`${playerTeddy.name} attacks ${aiTeddy.name}`);
  }

  playerUseSpecialMove(playerTeddy, aiTeddy, move) {
    combatEvents.emit('specialMove', playerTeddy, aiTeddy, move);
    console.log(`${playerTeddy.name} uses special move ${move} on ${aiTeddy.name}`);
  }

  aiTurn(aiTeddy, playerTeddy) {
    combatEvents.emit('aiMove', aiTeddy, playerTeddy);
    console.log(`AI turn for ${aiTeddy.name} against ${playerTeddy.name}`);
  }

  // ... Additional methods related to combat system ...
}

module.exports = CombatSystem;