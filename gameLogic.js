// gameLogic.js
const Teddy = require('./models/Teddy');
const Player = require('./models/Player');

async function initiateBattle(playerTeddyId) {
  try {
    const playerTeddy = await Teddy.findById(playerTeddyId);
    const opponentTeddy = await selectOpponent(playerTeddy);
    return {
      playerTeddy: { ...playerTeddy.toObject(), currentHealth: playerTeddy.health },
      opponentTeddy: { ...opponentTeddy.toObject(), currentHealth: opponentTeddy.health },
      turn: Math.random() < 0.5 ? 'player' : 'opponent',
      winner: null
    };
  } catch (error) {
    console.error('Error initiating battle:', error.message, error.stack);
    throw error;
  }
}

async function selectOpponent(playerTeddy) {
  const potentialOpponents = await Teddy.find({ _id: { $ne: playerTeddy._id } });
  return potentialOpponents[Math.floor(Math.random() * potentialOpponents.length)];
}

function executeTurn(battleState, playerMove) {
  const { playerTeddy, opponentTeddy } = battleState;
  console.log(`${battleState.turn}'s turn. Executing move:`, playerMove);

  if (playerMove.special) {
    applySpecialMove(playerTeddy, opponentTeddy);
  } else {
    opponentTeddy.currentHealth -= playerTeddy.attackDamage;
  }

  battleState.turn = battleState.turn === 'player' ? 'opponent' : 'player';

  determineBattleOutcome(battleState);

  return battleState;
}

function determineBattleOutcome(battleState) {
  const { playerTeddy, opponentTeddy } = battleState;

  if (opponentTeddy.currentHealth <= 0) {
    battleState.winner = 'player';
    console.log('Battle won by player');
  }

  if (playerTeddy.currentHealth <= 0) {
    battleState.winner = 'opponent';
    console.log('Battle won by opponent');
  }

  return battleState;
}

function applySpecialMove(attacker, defender) {
  console.log(`Applying special move from ${attacker.name} to ${defender.name}`);

  if (attacker.specialMove && attacker.specialMove.power && !defender.isImmune) {
    defender.currentHealth -= attacker.specialMove.power;
    console.log(`Special move applied: ${attacker.specialMove.name}, reduced ${defender.name}'s health to ${defender.currentHealth}`);
  } else {
    console.log(`No effect from special move: ${attacker.specialMove.name} on ${defender.name}`);
  }
}

async function levelUpTeddy(teddyId, experiencePoints) {
  const teddy = await Teddy.findById(teddyId);
  if (!teddy) {
    throw new Error('Teddy not found');
  }

  // Simulating level up logic
  teddy.experience += experiencePoints;
  if (teddy.experience >= 100) { // Assuming 100 XP needed to level up
    teddy.level = (teddy.level || 1) + 1;
    teddy.health += 10; // Increase health by 10 on each level up
    teddy.attackDamage += 5; // Increase attack by 5 on each level up
    teddy.experience = 0; // Reset experience after level up
  }

  await teddy.save();
  return teddy;
}

module.exports = {
  initiateBattle,
  executeTurn,
  determineBattleOutcome,
  applySpecialMove,
  levelUpTeddy
};