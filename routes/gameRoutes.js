const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const isAuthenticated = require('./middleware/authMiddleware').isAuthenticated;
const {
  loadTeddiesByIds,
  saveTeddyProgress,
  calculateExperiencePoints,
  checkForLevelUp,
  handleLevelUpRewards
} = require('../gameLogic');
const CombatSystem = require('../combatSystem'); // Import new combat system module
const Teddy = require('../models/Teddy');
const Player = require('../models/Player');

// Helper function to validate MongoDB Object IDs
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to validate player moves
const validPlayerMoves = ['attack', 'special']; // Extendable list of valid moves
const isValidPlayerMove = (move) => {
  return validPlayerMoves.includes(move);
};

// Route to choose a lineup of teddies
router.post('/game/choose-lineup', isAuthenticated, async (req, res) => {
  try {
    const teddyLineup = req.body.lineup;
    if (!teddyLineup || !Array.isArray(teddyLineup) || teddyLineup.length === 0 || !teddyLineup.every(isValidObjectId)) {
      console.log('Invalid lineup provided');
      return res.status(400).json({ error: 'Invalid lineup provided. Please select valid teddies.' });
    }
    const teddies = await loadTeddiesByIds(teddyLineup);
    if (teddies.length !== teddyLineup.length) {
      console.log('Some teddies not found');
      return res.status(404).json({ error: 'Some teddies not found' });
    }
    req.session.teddyLineup = teddies;
    await req.session.save();
    console.log('Lineup chosen for user:', req.session.userId);
    res.json({ message: 'Lineup chosen' });
  } catch (error) {
    console.error('Error choosing lineup:', error.message, error.stack);
    res.status(500).json({ error: 'Error choosing lineup' });
  }
});

// Route to initiate a battle
router.post('/game/initiate-battle', isAuthenticated, async (req, res) => {
  try {
    let selectedTeddyIds;
    try {
      selectedTeddyIds = JSON.parse(req.body.selectedTeddyIds); // Parse the JSON string back into an array
    } catch (parseError) {
      console.error('Error parsing selectedTeddyIds:', parseError.message, parseError.stack);
      return res.status(400).json({ error: 'Invalid teddy lineup for battle initiation. Unable to parse selected teddy IDs.' });
    }
    if (!selectedTeddyIds || !Array.isArray(selectedTeddyIds) || selectedTeddyIds.length !== 2 || !selectedTeddyIds.every(isValidObjectId)) {
      console.log('Invalid teddy lineup for battle initiation');
      return res.status(400).json({ error: 'Invalid teddy lineup for battle initiation. Please select exactly two teddies.' });
    }
    const teddies = await loadTeddiesByIds(selectedTeddyIds);
    if (teddies.length !== selectedTeddyIds.length) {
      console.log('Some teddies not found for battle initiation');
      return res.status(404).json({ error: 'Some teddies not found for battle initiation' });
    }
    const playerTeddy = teddies[0];
    const opponentTeddy = teddies[1];
    // Determine if the opponent is AI based on the request body parameter
    const isOpponentAI = req.body.opponentUserId === 'ai' || !req.body.opponentUserId;
    const combat = new CombatSystem(playerTeddy, opponentTeddy, isOpponentAI);
    combat.initiateBattle();
    const battleState = combat.getBattleState();
    req.session.battleState = battleState;
    await req.session.save();
    console.log('Battle initiated for user:', req.session.userId);
    res.json({ message: 'Battle initiated', isOpponentAI: isOpponentAI });
  } catch (error) {
    console.error('Error initiating battle:', error.message, error.stack);
    res.status(500).json({ error: 'Error initiating battle. Please ensure that the teddies selected are valid and try again.' });
  }
});

// Route to execute a player's turn
router.post('/game/execute-turn', isAuthenticated, async (req, res) => {
  try {
    const battleState = req.session.battleState;
    const playerMove = req.body.move;
    if (!battleState || typeof playerMove !== 'string' || !isValidPlayerMove(playerMove)) {
      console.log('Invalid battle state or player move');
      return res.status(400).json({ error: 'Invalid battle state or player move. Please provide a valid move.' });
    }
    const combat = new CombatSystem(battleState.playerTeddy, battleState.opponentTeddy, battleState.isOpponentAI);
    combat.setBattleState(battleState);
    if (battleState.turn === 'player') {
      combat.executePlayerTurn(playerMove);
    } else {
      combat.executeOpponentTurn();
    }
    let updatedBattleState = combat.getBattleState();

    // If the opponent is an AI and the battle is not yet won, execute the AI's turn
    if (updatedBattleState.isOpponentAI && updatedBattleState.winner === null) {
      const aiMove = combat.generateStrategicAIMove(); // Updated to use the new method name
      combat.executeOpponentTurn(aiMove);
      updatedBattleState = combat.getBattleState();
    }

    const player = await Player.findOne({ userId: req.session.userId });

    const experiencePointsEarned = calculateExperiencePoints(updatedBattleState.playerTeddy, updatedBattleState.opponentTeddy);
    player.experiencePoints += experiencePointsEarned;

    const playerLeveledUp = checkForLevelUp(player);
    if (playerLeveledUp) {
      handleLevelUpRewards(player);
    }

    await player.save();

    await saveTeddyProgress(updatedBattleState.playerTeddy);
    await saveTeddyProgress(updatedBattleState.opponentTeddy);

    req.session.battleState = updatedBattleState;
    await req.session.save();
    console.log('Turn executed for user:', req.session.userId);
    res.json(updatedBattleState);
  } catch (error) {
    console.error('Error executing turn:', error.message, error.stack);
    res.status(500).json({ error: 'Error executing turn' });
  }
});

// Route to render the teddies view
router.get('/teddies', isAuthenticated, async (req, res) => {
  try {
    const teddies = await Teddy.find({});
    if (teddies.length === 0) {
      console.log('No teddies found in the database');
      return res.status(404).json({ error: 'No teddies found' });
    }
    res.render('teddies', { teddies: teddies });
  } catch (error) {
    console.error('Error fetching teddies:', error.message, error.stack);
    res.status(500).json({ error: 'Internal Server Error: Unable to fetch teddies.' });
  }
});

// Route to render the battle arena view
router.get('/game/battle-arena', isAuthenticated, async (req, res) => {
  try {
    if (!req.session.battleState) {
      console.log('No battle state found, redirecting to teddies selection');
      res.redirect('/teddies');
    } else {
      res.render('battleArena', { battleState: req.session.battleState });
    }
  } catch (error) {
    console.error('Error rendering battle arena:', error.message, error.stack);
    res.status(500).json({ error: 'Internal Server Error: Unable to render battle arena.' });
  }
});

module.exports = router;