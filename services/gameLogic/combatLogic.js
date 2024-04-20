class CombatLogic {
  constructor(playerTeddy, opponentTeddy) {
    this.playerTeddy = playerTeddy;
    this.opponentTeddy = opponentTeddy;
    this.turn = 'player'; // Default starting turn
  }

  // Simulate a combat turn
  executeTurn(move) {
    try {
      if (!this.playerTeddy || !this.opponentTeddy) {
        throw new Error('Combatants must be defined before executing a turn.');
      }

      if (this.turn === 'player') {
        console.log(`Player's turn with move: ${move}`);
        this.processMove(move, this.playerTeddy, this.opponentTeddy);
        this.turn = 'opponent'; // Switch turn to opponent
      } else {
        console.log("Opponent's turn");
        const opponentMove = this.decideOpponentMove();
        this.processMove(opponentMove, this.opponentTeddy, this.playerTeddy);
        this.turn = 'player'; // Switch turn back to player
      }
    } catch (error) {
      console.error('Error executing turn:', error.message, error.stack);
    }
  }

  // Process the move
  processMove(move, attacker, defender) {
    if (!attacker || !defender) {
      console.log('Invalid combatants for the move.');
      return;
    }

    switch (move) {
      case 'attack':
        this.attack(attacker, defender);
        break;
      case 'special':
        this.specialMove(attacker, defender);
        break;
      default:
        console.log(`Invalid move: ${move}`);
    }
  }

  // Basic attack logic
  attack(attacker, defender) {
    const damage = attacker.attackDamage;
    defender.health -= damage;
    console.log(`${attacker.name} attacks ${defender.name} for ${damage} damage.`);
    if (defender.health <= 0) {
      console.log(`${defender.name} has been defeated.`);
    }
  }

  // Special move logic
  specialMove(attacker, defender) {
    // Example special move effect: Double damage
    const specialDamage = attacker.attackDamage * 2;
    defender.health -= specialDamage;
    console.log(`${attacker.name} uses their special move on ${defender.name}, dealing double damage for ${specialDamage}.`);
    if (defender.health <= 0) {
      console.log(`${defender.name} has been defeated by a special move.`);
    }
  }

  // AI logic for opponent's move decision
  decideOpponentMove() {
    // Simple AI decision logic
    if (this.opponentTeddy.health < 20) {
      return 'special'; // Use special move if health is low
    }
    return 'attack'; // Default to attack
  }
}

module.exports = CombatLogic;