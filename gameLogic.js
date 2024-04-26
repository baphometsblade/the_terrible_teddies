// gameLogic.js

const Teddy = require('./models/Teddy');
const Player = require('./models/Player'); // Assuming Player model path is correct

// Function to initiate a battle. This should set up the initial state for a battle.
async function initiateBattle(playerTeddyId) {
    try {
        const playerTeddy = await Teddy.findById(playerTeddyId);
        const opponentTeddy = await selectOpponent(playerTeddy);
        return {
            playerTeddy: { ...playerTeddy.toObject(), currentHealth: playerTeddy.health },
            opponentTeddy: { ...opponentTeddy.toObject(), currentHealth: opponentTeddy.health },
            turn: Math.random() < 0.5 ? 'player' : 'opponent', // Randomly decide who starts
            winner: null
        };
    } catch (error) {
        console.error('Error initiating battle:', error.message, error.stack);
        throw error;
    }
}

// Function to select an opponent (for simplicity, this function will randomly select an opponent)
async function selectOpponent(playerTeddy) {
    const potentialOpponents = await Teddy.find({ _id: { $ne: playerTeddy._id } });
    return potentialOpponents[Math.floor(Math.random() * potentialOpponents.length)];
}

// Function to execute a turn. This will process the player's move and the opponent's move.
function executeTurn(battleState, playerMove) {
    const { playerTeddy, opponentTeddy } = battleState;
    console.log(`${battleState.turn}'s turn. Executing move:`, playerMove);
    // Apply player move
    if (playerMove.special) {
        applySpecialMove(playerTeddy, opponentTeddy);
    } else {
        opponentTeddy.currentHealth -= playerTeddy.attackDamage;
    }
    
    // Switch turn
    battleState.turn = battleState.turn === 'player' ? 'opponent' : 'player';
    
    // Check battle outcome after each turn
    determineBattleOutcome(battleState);
    
    return battleState;
}

// Function to determine the outcome of the battle
function determineBattleOutcome(battleState) {
    const { playerTeddy, opponentTeddy } = battleState;
    // Check if the opponent is defeated
    if (opponentTeddy.currentHealth <= 0) {
        battleState.winner = 'player';
        console.log('Battle won by player');
    }
    
    // Check if the player is defeated
    if (playerTeddy.currentHealth <= 0) {
        battleState.winner = 'opponent';
        console.log('Battle won by opponent');
    }
    
    return battleState;
}

// Function to apply special moves. This can modify the game state in various ways.
function applySpecialMove(attacker, defender) {
    console.log(`Applying special move from ${attacker.name} to ${defender.name}`);
    // Check if special move is valid and if defender can counter or mitigate the effect
    if (attacker.specialMove && attacker.specialMove.power && !defender.isImmune) {
        defender.currentHealth -= attacker.specialMove.power;
        console.log(`Special move applied: ${attacker.specialMove.name}, reduced ${defender.name}'s health to ${defender.currentHealth}`);
    } else {
        console.log(`No effect from special move: ${attacker.specialMove.name} on ${defender.name}`);
    }
}

// Function to load teddies for a player's lineup from the database
async function loadTeddiesByIds(teddyIds) {
    try {
        const teddies = await Teddy.find({ '_id': { $in: teddyIds } });
        console.log('Loaded teddies for lineup:', teddies.map(teddy => teddy.name));
        return teddies;
    } catch (error) {
        console.error('Error loading teddies:', error.message, error.stack);
        throw error; // Rethrow the error to be handled by the calling function
    }
}

// Function to save teddy health and other attributes changes to the database
async function saveTeddyProgress(teddy) {
    try {
        const updateData = {
            health: teddy.currentHealth
        };
        await Teddy.findByIdAndUpdate(teddy._id, updateData);
        console.log(`Saved teddy progress for ${teddy.name}`);
    } catch (error) {
        console.error('Error saving teddy progress:', error.message, error.stack);
        throw error; // Rethrow the error to be handled by the calling function
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
    loadTeddiesByIds,
    saveTeddyProgress,
    levelUpTeddy
};