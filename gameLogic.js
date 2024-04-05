// gameLogic.js

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
    
    // Check if the opponent is defeated
    if (opponentTeddy.currentHealth <= 0) {
        battleState.winner = 'player';
        console.log('Battle won by player');
        return battleState;
    }
    
    // Process opponent's turn
    playerTeddy.currentHealth -= opponentTeddy.attackDamage;
    
    // Check if the player is defeated
    if (playerTeddy.currentHealth <= 0) {
        battleState.winner = 'opponent';
        console.log('Battle won by opponent');
        return battleState;
    }
    
    // Switch turn
    battleState.turn = battleState.turn === 'player' ? 'opponent' : 'player';
    
    return battleState;
}

// Function to apply special moves. This can modify the game state in various ways.
function applySpecialMove(attacker, defender) {
    console.log(`Applying special move from ${attacker.name} to ${defender.name}`);
    // Placeholder for special move logic
    // This would read the attacker's specialMove property and apply effects accordingly.
}

module.exports = {
    initiateBattle,
    executeTurn,
    applySpecialMove
};