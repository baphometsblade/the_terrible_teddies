const express = require('express');
const router = express.Router();
const Teddy = require('../../models/Teddy');
const Player = require('../../models/Player');
const gameLogic = require('../../gameLogic');

// Route to start a new game session
router.get('/start', async (req, res) => {
  try {
    const teddies = await Teddy.find().lean();
    res.render('game/start', { teddies });
    console.log('Game session started, teddies loaded.');
  } catch (error) {
    console.error('Error starting game session:', error.message, error.stack);
    res.status(500).send('Failed to start game session.');
  }
});

// Route to choose teddies for the lineup
router.post('/lineup', async (req, res) => {
  try {
    const selectedTeddyIds = req.body.selectedTeddyIds;
    const teddies = await Teddy.find({ _id: { $in: selectedTeddyIds } });
    req.session.teddies = teddies;
    res.redirect('/game/battle');
    console.log('Lineup chosen:', selectedTeddyIds);
  } catch (error) {
    console.error('Error selecting lineup:', error.message, error.stack);
    res.status(500).send('Failed to select lineup.');
  }
});

// Route to initiate a battle
router.get('/battle', async (req, res) => {
  try {
    const player = await Player.findById(req.session.userId);
    const result = gameLogic.initiateBattle(req.session.teddies, player);
    res.render('game/battle', { result });
    console.log('Battle initiated.');
  } catch (error) {
    console.error('Error initiating battle:', error.message, error.stack);
    res.status(500).send('Failed to initiate battle.');
  }
});

// Route to execute a player's turn
router.post('/execute-turn', async (req, res) => {
  try {
    const { teddyId, move } = req.body;
    const player = await Player.findById(req.session.userId);
    const teddy = await Teddy.findById(teddyId);
    const outcome = gameLogic.executeTurn(teddy, move, player);
    res.json(outcome);
    console.log('Turn executed for teddy:', teddyId);
  } catch (error) {
    console.error('Error executing turn:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to execute turn.' });
  }
});

module.exports = router;