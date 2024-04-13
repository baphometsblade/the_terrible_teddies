// aiLogic.js

// Function to generate a move for the AI opponent
function generateAIMove(battleState) {
    // Simple AI logic to randomly choose between 'attack' and 'special' moves
    const moves = ['attack', 'special'];
    const randomIndex = Math.floor(Math.random() * moves.length);
    const selectedMove = moves[randomIndex];
    console.log(`AI has chosen the move: ${selectedMove}`);
    return selectedMove;
}

module.exports = {
    generateAIMove
};