// gameLogic.js

const Teddy = require('./models/Teddy');

// Function to initiate a battle. This should set up the initial state for a battle.
function initiateBattle(playerTeddy, opponentTeddy) {
    console.log('Initiating battle between', playerTeddy.name, 'and', opponentTeddy.name);
    // Initialize battle state
    return {
        playerTeddy: {...playerTeddy, currentHealth: playerTeddy.health},
        opponentTeddy: {...opponentTeddy, currentHealth: opponentTeddy.health},
        turn: 'player', // 'player' or 'opponent'
        winner: null // 'player', 'opponent', or null if the battle is ongoing
    };
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
    // Placeholder for special move logic
    // This would read the attacker's specialMove property and apply effects accordingly.
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
            health: teddy.currentHealth,
            // Add other teddy attributes that need to be saved after a battle
            // Example: experience: teddy.experience
        };
        // Update the example attribute if it exists
        if (teddy.experience) {
            updateData.experience = teddy.experience;
        }
        await Teddy.findByIdAndUpdate(teddy._id, updateData);
        console.log(`Saved teddy progress for ${teddy.name}`);
    } catch (error) {
        console.error('Error saving teddy progress:', error.message, error.stack);
        throw error; // Rethrow the error to be handled by the calling function
    }
}

module.exports = {
    initiateBattle,
    executeTurn,
    determineBattleOutcome,
    applySpecialMove,
    loadTeddiesByIds,
    saveTeddyProgress
};