const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const isAuthenticated = require('./middleware/authMiddleware').isAuthenticated;
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

// Route for the home page
router.get('/', (req, res) => {
  try {
    res.render('home');
  } catch (error) {
    console.error('Error rendering home page:', error.message, error.stack);
    res.status(500).render('error', { error });
  }
});

// Route to choose a lineup of teddies
router.post('/game/choose-lineup', isAuthenticated, async (req, res) => {
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
router.post('/game/initiate-battle', isAuthenticated, async (req, res) => {
  try {
    const { playerTeddyId, opponentTeddyId } = req.body;
    if (!isValidObjectId(playerTeddyId) || !isValidObjectId(opponentTeddyId)) {
      return res.status(400).json({ error: 'Invalid teddy IDs provided.' });
    }
    const playerTeddy = await Teddy.findById(playerTeddyId);
    const opponentTeddy = await Teddy.findById(opponentTeddyId);
    if (!playerTeddy || !opponentTeddy) {
      return res.status(404).json({ error: 'One or more teddies not found.' });
    }
    // Initialize battle state in the session
    req.session.battleState = {
      playerTeddy: playerTeddy,
      opponentTeddy: opponentTeddy,
      turn: 'player' // Assuming the player always starts
    };
    await req.session.save();
    res.status(200).json({ message: 'Battle initiated', battleState: req.session.battleState });
  } catch (error) {
    console.error('Error initiating battle:', error.message, error.stack);
    res.status(500).json({ error: 'Error initiating battle. Please ensure that the teddies selected are valid and try again.' });
  }
});

// Route to execute a player's turn
router.post('/game/execute-turn', isAuthenticated, async (req, res) => {
  try {
    const { move } = req.body;
    const battleState = req.session.battleState;
    if (!battleState || !isValidPlayerMove(move)) {
      return res.status(400).json({ error: 'Invalid battle state or move.' });
    }
    // ... add code here to handle the player's move ...
    // ... add code here to update the battle state ...
    // ... add code here to save the session ...
    res.status(200).json({ message: 'Turn executed', battleState: battleState }); // Updated to use the battleState variable
  } catch (error) {
    console.error('Error executing turn:', error.message, error.stack);
    res.status(500).json({ error: 'Error executing turn' });
  }
});

// Route to render the teddies view
router.get('/teddies', isAuthenticated, async (req, res) => {
  try {
    const teddies = await Teddy.find({});
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