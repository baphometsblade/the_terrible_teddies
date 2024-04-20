const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const combinedAuthMiddleware = require('../middleware/combinedAuthMiddleware'); // Import the combinedAuthMiddleware
const Teddy = require('../models/Teddy');
const Player = require('../models/Player');
const sessionUtils = require('../utils/sessionUtils'); // Import session utilities
const rateLimit = require('express-rate-limit'); //
const { body, validationResult } = require('express-validator'); // 

// Helper function to validate MongoDB Object IDs
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to validate player moves
const validPlayerMoves = ['attack', 'special']; // Extendable list of valid moves
const isValidPlayerMove = (move) => {
  return validPlayerMoves.includes(move);
};

// Apply rate limiting to all game routes as a basic abuse prevention measure
const gameRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes"
});

router.use(gameRateLimiter);

// Route for the home page
router.get('/', (req, res) => {
  try {
    const sessionUser = sessionUtils.getSessionUser(req.session);
    if (!sessionUser || !sessionUser.userId) {
      console.log('getSessionUser: Missing session or userId');
      return res.redirect('/login'); // Redirect to login if session or userId is missing
    }
    res.render('index', { userId: sessionUser.userId });
  } catch (error) {
    console.error('Error rendering home page:', error.message, error.stack);
    res.status(500).render('error', { error: 'Error rendering home page. Please try again later.', stack: error.stack });
  }
});

// Route to choose a lineup of teddies
router.post('/game/choose-lineup', combinedAuthMiddleware, [
  body('lineup.*').isMongoId().withMessage('Each teddy ID must be a valid MongoDB ObjectId')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const teddyLineup = req.body.lineup;
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
router.post('/game/initiate-battle', combinedAuthMiddleware, [
  body('selectedTeddyIds').custom((value) => {
    const ids = value.split(',').map(id => id.trim());
    if (!ids.every(isValidObjectId)) {
      throw new Error('All teddy IDs must be valid MongoDB ObjectIds');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const selectedTeddyIds = req.body.selectedTeddyIds.split(',').map(id => id.trim());
    const teddies = await Teddy.find({ '_id': { $in: selectedTeddyIds } });
    // Initialize battle state in the session
    req.session.battleState = {
      teddies: teddies,
      turn: 'player' // Assuming the player always starts
    };
    await req.session.save();
    console.log('Battle initiated successfully with teddies:', selectedTeddyIds.join(', '));
    res.status(200).json({ message: 'Battle initiated', battleState: req.session.battleState });
  } catch (error) {
    console.error('Error initiating battle:', error.message, error.stack);
    res.status(500).json({ error: 'Error initiating battle. Please ensure that the teddies selected are valid and try again.' });
  }
});

// Route to execute a player's turn
router.post('/game/execute-turn', combinedAuthMiddleware, [
  body('move').isIn(validPlayerMoves).withMessage('Invalid move provided')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { move } = req.body;
    const battleState = req.session.battleState;
    console.log('Executing turn with move:', move);
    // Placeholder for actual move execution logic
    // Placeholder for updating the battle state
    // Placeholder for saving the session
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

// Route to render the dashboard view
router.get('/dashboard', combinedAuthMiddleware, async (req, res) => {
  try {
    const sessionUser = sessionUtils.getSessionUser(req.session);
    if (!sessionUser || !sessionUser.userId) {
      console.log('getSessionUser: Missing session or userId, redirecting to login');
      return res.redirect('/login');
    }
    const playerDetails = await Player.findOne({ userId: sessionUser.userId });
    if (!playerDetails) {
      console.log('No player details found, redirecting to setup profile');
      return res.redirect('/setup-profile');
    }
    res.render('dashboard', { sessionUser: sessionUser, playerDetails: playerDetails });
  } catch (error) {
    console.error('Error rendering dashboard:', error.message, error.stack);
    res.status(500).render('error', { error: 'Error rendering dashboard. Please try again later.', stack: error.stack });
  }
});

// Route for the tutorial page
router.get('/tutorial', (req, res) => {
  res.render('tutorial');
});

module.exports = router;