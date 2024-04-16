const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const combinedAuthMiddleware = require('../middleware/combinedAuthMiddleware'); // Import the combinedAuthMiddleware
const Teddy = require('../models/Teddy');
const Player = require('../models/Player');
const sessionUtils = require('../utils/sessionUtils'); // Import session utilities

// Helper function to validate MongoDB Object IDs
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to validate player moves
const validPlayerMoves = ['attack', 'special']; // Extendable list of valid moves
const isValidPlayerMove = (move) => {
  return validPlayerMoves.includes(move);
};

// Route for the home page
router.get('/', (req, res) => {
  try {
    const sessionUser = sessionUtils.getSessionUser(req.session);
    res.render('index', { userId: sessionUser.userId });
  } catch (error) {
    console.error('Error rendering home page:', error.message, error.stack);
    res.status(500).render('error', { error });
  }
});

// Route to choose a lineup of teddies
router.post('/game/choose-lineup', combinedAuthMiddleware, async (req, res) => {
  try {
    const teddyLineup = req.body.lineup;
    if (!teddyLineup || !Array.isArray(teddyLineup) || teddyLineup.length === 0 || !teddyLineup.every(isValidObjectId)) {
      console.log('Invalid lineup provided');
      return res.status(400).json({ error: 'Invalid lineup provided. Please select valid teddies.' });
    }
    const teddies = await Teddy.find({ '_id': { $in: teddyLineup } });
    req.session.teddyLineup = teddies;
    await req.session.save();
    res.status(200).json({ message: 'Lineup successfully chosen', teddies: teddies });
  } catch (error) {
    console.error('Error choosing lineup:', error.message, error.stack);
    res.status(500).json({ error: 'Error choosing lineup' });
  }
});

// Route to initiate a battle
router.post('/game/initiate-battle', combinedAuthMiddleware, async (req, res) => {
  try {
    const { playerTeddyId, opponentTeddyId } = req.body;
    if (!isValidObjectId(playerTeddyId) || !isValidObjectId(opponentTeddyId)) {
      return res.status(400).json({ error: 'Invalid teddy IDs provided.' });
    }
    const playerTeddy = await Teddy.findById(playerTeddyId);
    const opponentTeddy = await Teddy.findById(opponentTeddyId);
    if (!playerTeddy || !opponentTeddy) {
      const missingTeddyId = !playerTeddy ? playerTeddyId : opponentTeddyId;
      console.error(`Teddy not found with id: ${missingTeddyId}`);
      return res.status(404).json({ error: `Teddy not found with id: ${missingTeddyId}.` });
    }
    // Initialize battle state in the session
    req.session.battleState = {
      playerTeddy: playerTeddy,
      opponentTeddy: opponentTeddy,
      turn: 'player' // Assuming the player always starts
    };
    await req.session.save();
    console.log('Battle initiated successfully');
    res.status(200).json({ message: 'Battle initiated', battleState: req.session.battleState });
  } catch (error) {
    console.error('Error initiating battle:', error.message, error.stack);
    res.status(500).json({ error: 'Error initiating battle. Please ensure that the teddies selected are valid and try again.' });
  }
});

// Route to execute a player's turn
router.post('/game/execute-turn', combinedAuthMiddleware, async (req, res) => {
  try {
    const { move } = req.body;
    const battleState = req.session.battleState;
    if (!battleState || !isValidPlayerMove(move)) {
      return res.status(400).json({ error: 'Invalid battle state or move.' });
    }
    // Placeholder for actual move execution logic
    // Placeholder for updating the battle state
    // Placeholder for saving the session
    console.log('Executing turn');
    res.status(200).json({ message: 'Turn executed', battleState: battleState });
  } catch (error) {
    console.error('Error executing turn:', error.message, error.stack);
    res.status(500).json({ error: 'Error executing turn' });
  }
});

// Route to render the teddies view
router.get('/teddies', combinedAuthMiddleware, async (req, res) => {
  try {
    const teddies = await Teddy.find({});
    res.render('teddies', { teddies: teddies });
  } catch (error) {
    console.error('Error fetching teddies:', error.message, error.stack);
    res.status(500).json({ error: 'Internal Server Error: Unable to fetch teddies.' });
  }
});

// Route to render the battle arena view
router.get('/game/battle-arena', combinedAuthMiddleware, async (req, res) => {
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