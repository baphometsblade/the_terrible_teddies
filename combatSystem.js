// combatSystem.js

const Teddy = require('./models/Teddy');

class CombatSystem {
  constructor(playerTeddy, opponentTeddy, isOpponentAI) {
    this.playerTeddy = playerTeddy;
    this.opponentTeddy = opponentTeddy;
    this.isOpponentAI = isOpponentAI;
    this.turn = 'player'; // 'player' or 'opponent'
    this.winner = null; // 'player', 'opponent', or null if the battle is ongoing
  }

  initiateBattle() {
    console.log('CombatSystem: Initiating battle between', this.playerTeddy.name, 'and', this.opponentTeddy.name);
    this.playerTeddy.currentHealth = this.playerTeddy.health;
    this.opponentTeddy.currentHealth = this.opponentTeddy.health;
  }

  executePlayerTurn(move) {
    console.log(`CombatSystem: ${this.turn}'s turn. Executing move:`, move);
    if (move === 'special') {
      this.applySpecialMove(this.playerTeddy, this.opponentTeddy);
    } else {
      this.opponentTeddy.currentHealth -= this.playerTeddy.attackDamage;
    }
    this.determineBattleOutcome();
    this.switchTurn();
  }

  executeOpponentTurn() {
    if (this.isOpponentAI && this.winner === null) {
      const aiMove = this.generateStrategicAIMove();
      console.log(`CombatSystem: Opponent AI executing move:`, aiMove);
      if (aiMove === 'special') {
        this.applySpecialMove(this.opponentTeddy, this.playerTeddy);
      } else {
        this.playerTeddy.currentHealth -= this.opponentTeddy.attackDamage;
      }
      this.determineBattleOutcome();
      this.switchTurn();
    }
  }

  generateStrategicAIMove() {
    // AI logic to make a strategic decision based on the current state of the game
    // For example, the AI may choose to use a special move if the player's health is low
    // or if the AI's health is high enough to withstand a counter-attack.
    if (this.opponentTeddy.currentHealth > this.playerTeddy.currentHealth && this.opponentTeddy.currentHealth > 30) {
      return 'special';
    } else {
      return 'attack';
    }
  }

  determineBattleOutcome() {
    if (this.opponentTeddy.currentHealth <= 0) {
      this.winner = 'player';
      console.log('CombatSystem: Battle won by player');
    } else if (this.playerTeddy.currentHealth <= 0) {
      this.winner = 'opponent';
      console.log('CombatSystem: Battle won by opponent');
    }
  }

  applySpecialMove(attacker, defender) {
    console.log(`CombatSystem: Applying special move from ${attacker.name} to ${defender.name}`);
    // The special move logic should be dynamic and based on the teddy's attributes or special move details
    // For example, it could reduce the defender's health by a percentage of the attacker's attackDamage
    const specialMoveEffect = attacker.specialMove; // Assuming specialMove is a string describing the effect
    // Placeholder for special move logic
    // This should be replaced with actual logic to handle different special moves
    if (specialMoveEffect === 'doubleDamage') {
      defender.currentHealth -= attacker.attackDamage * 2;
    } else if (specialMoveEffect === 'heal') {
      attacker.currentHealth += 20; // Heal the attacker
      attacker.currentHealth = Math.min(attacker.currentHealth, attacker.health); // Cap at max health
    } else {
      // Default special move effect
      defender.currentHealth -= 20; // Default damage if no special move is defined
    }
  }

  switchTurn() {
    if (this.winner === null) {
      this.turn = this.turn === 'player' ? 'opponent' : 'player';
    }
  }

  getBattleState() {
    return {
      playerTeddy: this.playerTeddy,
      opponentTeddy: this.opponentTeddy,
      turn: this.turn,
      winner: this.winner,
      isOpponentAI: this.isOpponentAI
    };
  }
}

module.exports = CombatSystem;