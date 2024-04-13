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
    try {
      console.log(`CombatSystem: ${this.turn}'s turn. Executing move:`, move);
      if (move === 'special') {
        this.applySpecialMove(this.playerTeddy, this.opponentTeddy);
      } else {
        this.opponentTeddy.currentHealth -= this.playerTeddy.attackDamage;
      }
      this.determineBattleOutcome();
      this.switchTurn();
    } catch (error) {
      console.error('Error executing player turn:', error.message, error.stack);
    }
  }

  executeOpponentTurn() {
    try {
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
    } catch (error) {
      console.error('Error executing opponent turn:', error.message, error.stack);
    }
  }

  generateStrategicAIMove() {
    try {
      // Enhanced AI logic to make a strategic decision based on the current state of the game
      // The AI will consider the health, attack damage, and special moves of both teddies
      // to make a decision. The logic below is a placeholder and should be replaced with
      // a more sophisticated algorithm that takes into account the full range of attributes
      // and strategic depth as requested.
      if (this.opponentTeddy.currentHealth > this.playerTeddy.currentHealth) {
        if (this.opponentTeddy.currentHealth > 50) {
          return 'special';
        }
      }
      if (this.playerTeddy.currentHealth < 30 && this.opponentTeddy.attackDamage >= this.playerTeddy.currentHealth) {
        return 'attack';
      }
      // If the opponent's health is low, prioritize attacking
      if (this.opponentTeddy.currentHealth < 20) {
        return 'attack';
      }
      // If the player's health is high, consider using a special move
      if (this.playerTeddy.currentHealth > 80) {
        return 'special';
      }
      // Default to attack if none of the above conditions are met
      return 'attack';
    } catch (error) {
      console.error('Error generating strategic AI move:', error.message, error.stack);
      return 'attack'; // Default to attack if there's an error
    }
  }

  determineBattleOutcome() {
    try {
      if (this.opponentTeddy.currentHealth <= 0) {
        this.winner = 'player';
        console.log('CombatSystem: Battle won by player');
      } else if (this.playerTeddy.currentHealth <= 0) {
        this.winner = 'opponent';
        console.log('CombatSystem: Battle won by opponent');
      }
    } catch (error) {
      console.error('Error determining battle outcome:', error.message, error.stack);
    }
  }

  applySpecialMove(attacker, defender) {
    try {
      console.log(`CombatSystem: Applying special move from ${attacker.name} to ${defender.name}`);
      const specialMoveEffect = attacker.specialMove; // Assuming specialMove is a string describing the effect
      switch (specialMoveEffect) {
        case 'doubleDamage':
          defender.currentHealth -= attacker.attackDamage * 2;
          break;
        case 'heal':
          attacker.currentHealth += 20; // Heal the attacker
          attacker.currentHealth = Math.min(attacker.currentHealth, attacker.health); // Cap at max health
          break;
        default:
          // Default special move effect
          defender.currentHealth -= 20; // Default damage if no special move is defined
          break;
      }
    } catch (error) {
      console.error('Error applying special move:', error.message, error.stack);
    }
  }

  switchTurn() {
    try {
      if (this.winner === null) {
        this.turn = this.turn === 'player' ? 'opponent' : 'player';
      }
    } catch (error) {
      console.error('Error switching turns:', error.message, error.stack);
    }
  }

  getBattleState() {
    try {
      return {
        playerTeddy: this.playerTeddy,
        opponentTeddy: this.opponentTeddy,
        turn: this.turn,
        winner: this.winner,
        isOpponentAI: this.isOpponentAI
      };
    } catch (error) {
      console.error('Error getting battle state:', error.message, error.stack);
      return null; // Return null if there's an error
    }
  }
}

module.exports = CombatSystem;