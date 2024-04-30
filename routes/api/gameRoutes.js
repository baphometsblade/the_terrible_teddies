const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/authMiddleware');
const { initiateBattle, executeTurn, determineBattleOutcome, loadTeddiesByIds, saveTeddyProgress, levelUpTeddy, initiateBossFight } = require('../../gameLogic');
const { loadEndGameContent } = require('../../services/endGameService'); // Corrected the path to endGameService
const Teddy = require('../../models/Teddy'); // Corrected the path to Teddy model

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
    console.log('Lineup chosen for user:', req.session.userId);
    res.send('Lineup chosen');
  } catch (error) {
    console.error('Error choosing lineup:', error.message, error.stack);
    res.status(500).send('Error choosing lineup');
  }
});

// Route to initiate a battle
router.post('/game/initiate-battle', isAuthenticated, async (req, res) => {
  try {
    const { playerTeddyId, opponentTeddyId } = req.body;
    if (!playerTeddyId || !opponentTeddyId) {
      console.log('Player or opponent teddy ID not provided for battle initiation');
      return res.status(400).send('Player or opponent teddy ID not provided for battle initiation');
    }
    const playerTeddy = await Teddy.findById(playerTeddyId);
    const opponentTeddy = await Teddy.findById(opponentTeddyId);
    if (!playerTeddy || !opponentTeddy) {
      console.log('Player or opponent teddy not found');
      return res.status(404).send('Player or opponent teddy not found');
    }
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
    await saveTeddyProgress(updatedBattleState.playerTeddy);
    await saveTeddyProgress(updatedBattleState.opponentTeddy);
    req.session.battleState = updatedBattleState;
    console.log('Turn executed for user:', req.session.userId);
    res.json(updatedBattleState);
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
    res.render('teddies', { teddies: teddies, user: req.session });
  } catch (error) {
    console.error('Error fetching teddies:', error.message, error.stack);
    res.status(500).send('Error fetching teddies');
  }
});

// Route to render the battle view
router.get('/game/battle', isAuthenticated, async (req, res) => {
  try {
    if (!req.session.battleState) {
      console.log('No battle state found for user:', req.session.userId);
      return res.redirect('/teddies');
    }
    res.render('battle', { battleState: req.session.battleState, user: req.session });
  } catch (error) {
    console.error('Error rendering battle view:', error.message, error.stack);
    res.status(500).send('Error rendering battle view');
  }
});

// Route to customize a teddy
router.post('/api/teddies/customize', async (req, res) => {
  const { teddyId, skinId, accessoryId } = req.body;
  try {
    await Teddy.findByIdAndUpdate(teddyId, {
      $push: {
        skins: skinId,
        accessories: accessoryId
      }
    });
    console.log('Customization updated for teddy:', teddyId);
    res.status(200).send('Customization updated');
  } catch (error) {
    console.error('Error customizing teddy:', error.message, error.stack);
    res.status(500).send('Error customizing teddy');
  }
});

// Route for trading teddy cards
router.post('/api/trade', isAuthenticated, async (req, res) => {
  const { teddyIdOne, teddyIdTwo, playerIdOne, playerIdTwo } = req.body;
  try {
    // Validate the teddy IDs
    const teddyOne = await Teddy.findById(teddyIdOne);
    const teddyTwo = await Teddy.findById(teddyIdTwo);
    if (!teddyOne || !teddyTwo) {
      return res.status(404).send('One or both teddies not found');
    }

    // Simulate the trade logic (to be implemented)
    console.log(`Trading teddies between player ${playerIdOne} and player ${playerIdTwo}`);
    res.send('Trade successful');
  } catch (error) {
    console.error('Error during trade:', error.message, error.stack);
    res.status(500).send('Trade failed');
  }
});

// Route to level up a teddy
router.post('/api/progress/level-up', isAuthenticated, async (req, res) => {
  const { teddyId, experiencePoints } = req.body;
  if (!teddyId || experiencePoints === undefined) {
    return res.status(400).json({ message: "Teddy ID and experience points are required." });
  }

  try {
    const updatedTeddy = await levelUpTeddy(teddyId, experiencePoints);
    res.status(200).json({ message: 'Teddy leveled up successfully', teddy: updatedTeddy });
  } catch (error) {
    console.error('Error leveling up teddy:', error.message, error.stack);
    res.status(500).json({ message: error.message });
  }
});

// Route to fetch and return a list of available special events
router.get('/api/events', isAuthenticated, async (req, res) => {
  try {
    const events = await loadEndGameContent(); // Assuming this function is already implemented
    res.json(events);
  } catch (error) {
    console.error('Error loading end-game content:', error.message, error.stack);
    res.status(500).send('Error loading end-game content');
  }
});

// Route to initiate a boss fight
router.post('/api/boss-fight', isAuthenticated, async (req, res) => {
  const { playerId, bossId } = req.body;
  try {
    const result = await initiateBossFight(playerId, bossId);
    res.json(result);
  } catch (error) {
    console.error('Error initiating boss fight:', error.message, error.stack);
    res.status(500).send('Error initiating boss fight');
  }
});

module.exports = router;