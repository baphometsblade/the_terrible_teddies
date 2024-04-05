const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const { initiateBattle, executeTurn } = require('../gameLogic');
const Teddy = require('../models/Teddy');

// Route to start a new game session
router.post('/game/session', isAuthenticated, (req, res) => {
  req.session.gameState = {}; // Placeholder for initial game state
  console.log('New game session started for user:', req.session.userId);
  res.send('New game session started');
});

// Route to choose a lineup of teddies
router.post('/game/choose-lineup', isAuthenticated, async (req, res) => {
  try {
    const teddyLineup = req.body.lineup;
    if (!teddyLineup || !Array.isArray(teddyLineup) || teddyLineup.length === 0) {
      console.log('No lineup provided or lineup is not an array or empty');
      return res.status(400).send('No lineup provided or lineup is not an array or empty');
    }
    const teddies = await Teddy.find({ '_id': { $in: teddyLineup } });
    if (teddies.length !== teddyLineup.length) {
      console.log('Some teddies not found');
      return res.status(404).send('Some teddies not found');
    }
    req.session.teddyLineup = teddies;
    console.log('Lineup chosen for user:', req.session.userId);
    res.send('Lineup chosen');
  } catch (error) {
    console.error('Error choosing lineup:', error.message, error.stack);
    res.status(500).send('Error choosing lineup');
  }
});

// Route to initiate a battle
router.post('/game/initiate-battle', isAuthenticated, (req, res) => {
  try {
    if (!req.session.teddyLineup || req.session.teddyLineup.length < 2) {
      console.log('Invalid teddy lineup for battle initiation');
      return res.status(400).send('Invalid teddy lineup for battle initiation');
    }
    const playerTeddy = req.session.teddyLineup[0];
    const opponentTeddy = req.session.teddyLineup[1];
    const battleState = initiateBattle(playerTeddy, opponentTeddy);
    req.session.battleState = battleState;
    console.log('Battle initiated for user:', req.session.userId);
    res.json(battleState);
  } catch (error) {
    console.error('Error initiating battle:', error.message, error.stack);
    res.status(500).send('Error initiating battle');
  }
});

// Route to execute a player's turn
router.post('/game/execute-turn', isAuthenticated, (req, res) => {
  try {
    const battleState = req.session.battleState;
    const playerMove = req.body.move;
    if (!battleState || !playerMove) {
      console.log('Invalid battle state or player move');
      return res.status(400).send('Invalid battle state or player move');
    }
    const updatedBattleState = executeTurn(battleState, playerMove);
    req.session.battleState = updatedBattleState;
    console.log('Turn executed for user:', req.session.userId);
    res.json(updatedBattleState);
  } catch (error) {
    console.error('Error executing turn:', error.message, error.stack);
    res.status(500).send('Error executing turn');
  }
});

module.exports = router;