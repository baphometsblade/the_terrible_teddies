const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const { initiateBattle, executeTurn, determineBattleOutcome, loadTeddiesByIds, saveTeddyProgress, calculateExperiencePoints, checkForLevelUp } = require('../gameLogic');
const Teddy = require('../models/Teddy'); // Import the Teddy model
const Player = require('../models/Player'); // Import the Player model

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
    const teddies = await loadTeddiesByIds(teddyLineup);
    if (teddies.length !== teddyLineup.length) {
      console.log('Some teddies not found');
      return res.status(404).send('Some teddies not found');
    }
    req.session.teddyLineup = teddies;
    req.session.save(err => {
      if (err) {
        console.error('Error saving session:', err.message, err.stack);
        return res.status(500).send('Error saving session');
      }
      console.log('Lineup chosen for user:', req.session.userId);
      res.send('Lineup chosen');
    });
  } catch (error) {
    console.error('Error choosing lineup:', error.message, error.stack);
    res.status(500).send('Error choosing lineup');
  }
});

// Route to initiate a battle
router.post('/game/initiate-battle', isAuthenticated, async (req, res) => {
  try {
    if (typeof req.body.selectedTeddyIds !== 'string' || req.body.selectedTeddyIds.split(',').length !== 2) {
      console.log('Invalid teddy lineup for battle initiation');
      return res.status(400).send('Invalid teddy lineup for battle initiation');
    }
    const selectedTeddyIds = req.body.selectedTeddyIds.split(',');
    const teddies = await loadTeddiesByIds(selectedTeddyIds);
    if (teddies.length !== selectedTeddyIds.length) {
      console.log('Some teddies not found for battle initiation');
      return res.status(404).send('Some teddies not found for battle initiation');
    }
    const playerTeddy = teddies[0];
    const opponentTeddy = teddies[1];
    const battleState = initiateBattle(playerTeddy, opponentTeddy);
    req.session.battleState = battleState;
    req.session.save(err => {
      if (err) {
        console.error('Error saving session:', err.message, err.stack);
        return res.status(500).send('Error saving session');
      }
      console.log('Battle initiated for user:', req.session.userId);
      res.send('Battle initiated'); // Removed redirection to non-existent route
    });
  } catch (error) {
    console.error('Error initiating battle:', error.message, error.stack);
    res.status(500).send('Error initiating battle');
  }
});

// Route to execute a player's turn
router.post('/game/execute-turn', isAuthenticated, async (req, res) => {
  try {
    const battleState = req.session.battleState;
    const playerMove = req.body.move;
    if (!battleState || !playerMove) {
      console.log('Invalid battle state or player move');
      return res.status(400).send('Invalid battle state or player move');
    }
    let updatedBattleState = executeTurn(battleState, playerMove);
    updatedBattleState = determineBattleOutcome(updatedBattleState); // Determine the outcome after executing the turn

    // Find player data
    const player = await Player.findOne({ userId: req.session.userId });

    // Calculate experience points earned
    const experiencePointsEarned = calculateExperiencePoints(updatedBattleState.playerTeddy, updatedBattleState.opponentTeddy);
    player.experiencePoints += experiencePointsEarned;
    
    // Check for level up and apply rewards if the player leveled up
    checkForLevelUp(player);

    // Save the player's new experience points and level
    await player.save();

    await saveTeddyProgress(updatedBattleState.playerTeddy);
    await saveTeddyProgress(updatedBattleState.opponentTeddy);
    req.session.battleState = updatedBattleState;
    req.session.save(err => {
      if (err) {
        console.error('Error saving session:', err.message, err.stack);
        return res.status(500).send('Error saving session');
      }
      console.log('Turn executed for user:', req.session.userId);
      res.json(updatedBattleState);
    });
  } catch (error) {
    console.error('Error executing turn:', error.message, error.stack);
    res.status(500).send('Error executing turn');
  }
});

// Route to render the teddies view
router.get('/teddies', isAuthenticated, async (req, res) => {
  try {
    const teddies = await Teddy.find({});
    if (teddies.length === 0) {
      console.log('No teddies found in the database');
      return res.status(404).send('No teddies found');
    }
    res.render('teddies', { teddies: teddies });
  } catch (error) {
    console.error('Error fetching teddies:', error.message, error.stack);
    res.status(500).send('Internal Server Error: Unable to fetch teddies.'); // Updated error message for clarity
    console.error('Detailed error:', error); // Log the full error details for debugging
  }
});

module.exports = router;