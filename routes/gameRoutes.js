const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const { initiateBattle, executeTurn, initiateEndGameBattle, loadTeddiesByIds, saveTeddyProgress } = require('../gameLogic');
const { loadEndGameContent } = require('../services/endGameService');
const Teddy = require('../models/Teddy'); // Import the Teddy model

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
router.post('/game/initiate-battle', isAuthenticated, (req, res) => {
  try {
    if (!req.session.teddyLineup || req.session.teddyLineup.length !== 2) {
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
router.post('/game/execute-turn', isAuthenticated, async (req, res) => {
  try {
    const battleState = req.session.battleState;
    const playerMove = req.body.move === 'special' ? 'special' : 'attack';
    if (!battleState) {
      console.log('No battle in progress');
      return res.status(400).send('No battle in progress');
    }
    if (battleState.status !== 'active') {
      console.log('Battle already finished');
      return res.status(409).send('This battle is already finished');
    }

    const updatedBattleState = executeTurn(battleState, playerMove);

    // Only award progression once the battle has actually concluded.
    if (updatedBattleState.status === 'finished') {
      await saveTeddyProgress(updatedBattleState.player, { won: updatedBattleState.winner === 'player' });
      await saveTeddyProgress(updatedBattleState.opponent, { won: updatedBattleState.winner === 'opponent' });
    }

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

// Route to customize a teddy.
// Previously this had no authentication at all: any anonymous caller could
// mutate any teddy in the database by guessing an id.
router.post('/api/teddies/customize', isAuthenticated, async (req, res) => {
  const { teddyId, skinId, accessoryId } = req.body;

  if (!isValidId(teddyId)) {
    return res.status(400).send('A valid teddyId is required');
  }
  if (skinId && !isValidId(skinId)) {
    return res.status(400).send('skinId must be a valid id');
  }
  if (accessoryId && !isValidId(accessoryId)) {
    return res.status(400).send('accessoryId must be a valid id');
  }
  if (!skinId && !accessoryId) {
    return res.status(400).send('Provide a skinId or an accessoryId');
  }

  try {
    const teddy = await Teddy.findById(teddyId);
    if (!teddy) {
      return res.status(404).send('Teddy not found');
    }

    // Teddies predating the owner field are unowned; once owned, only the
    // owner may customise.
    if (teddy.owner && String(teddy.owner) !== String(req.session.userId)) {
      console.warn(`User ${req.session.userId} tried to customise teddy ${teddyId} owned by ${teddy.owner}`);
      return res.status(403).send('That teddy is not yours');
    }

    const update = {};
    if (skinId) update.skins = skinId;
    if (accessoryId) update.accessories = accessoryId;

    await Teddy.findByIdAndUpdate(teddyId, { $addToSet: update });
    console.log('Customization updated for teddy:', teddyId);
    res.status(200).send('Customization updated');
  } catch (error) {
    console.error('Error customizing teddy:', error.message, error.stack);
    res.status(500).send('Error customizing teddy');
  }
});

// Route to load end-game content
router.get('/game/end-game', isAuthenticated, async (req, res) => {
  try {
    const content = await loadEndGameContent();
    if (!content.arenas.length || !content.bosses.length) {
      console.log('No end game arenas or bosses found in the database.');
      return res.status(404).json({ message: 'No end game content available at this moment.' });
    }
    res.json(content);
  } catch (error) {
    console.error('Error loading end-game content:', error.message, error.stack);
    res.status(500).send('Failed to load end-game content');
  }
});

// Route to initiate an end-game battle
router.post('/game/initiate-end-game-battle', isAuthenticated, async (req, res) => {
  try {
    const { playerTeddyId, arenaId } = req.body;
    const battleSetup = await initiateEndGameBattle(playerTeddyId, arenaId);
    res.json(battleSetup);
  } catch (error) {
    console.error('Error initiating end-game battle:', error.message, error.stack);
    res.status(500).send('Failed to initiate end-game battle');
  }
});

module.exports = router;