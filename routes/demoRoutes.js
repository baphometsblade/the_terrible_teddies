const express = require('express');
const { DEMO_TEDDIES, getDemoTeddyById } = require('../data/demoTeddies');
const { createBattle, executeTurn, autoBattle } = require('../services/battleEngine');

const router = express.Router();

function pickOpponent(playerId) {
  return DEMO_TEDDIES.find((teddy) => teddy._id !== playerId) || DEMO_TEDDIES[0];
}

router.get('/play', (req, res) => {
  res.render('play', {
    teddies: DEMO_TEDDIES,
    battle: null,
    selectedTeddyId: null,
    founderPackUrl: process.env.FOUNDER_PACK_URL || '',
    demoMode: process.env.DEMO_MODE === 'true' || !process.env.DATABASE_URL
  });
});

router.post('/play/start', (req, res) => {
  const selectedTeddyId = req.body.teddyId || DEMO_TEDDIES[0]._id;
  const playerTeddy = getDemoTeddyById(selectedTeddyId) || DEMO_TEDDIES[0];
  const opponentTeddy = pickOpponent(playerTeddy._id);
  const battle = createBattle(playerTeddy, opponentTeddy);
  req.session.demoBattle = battle;

  res.render('play', {
    teddies: DEMO_TEDDIES,
    battle,
    selectedTeddyId,
    founderPackUrl: process.env.FOUNDER_PACK_URL || '',
    demoMode: process.env.DEMO_MODE === 'true' || !process.env.DATABASE_URL
  });
});

router.post('/play/turn', (req, res) => {
  const move = req.body.move === 'special' ? 'special' : 'attack';
  const existingBattle = req.session.demoBattle;

  // Taking a turn with no battle in progress used to fall through to a render
  // with battle undefined, which silently did nothing and told the player
  // nothing. Send them back to pick a fighter instead.
  if (!existingBattle) {
    return res.redirect('/play');
  }

  const battle = executeTurn(existingBattle, move);
  req.session.demoBattle = battle;

  res.render('play', {
    teddies: DEMO_TEDDIES,
    battle,
    selectedTeddyId: battle && battle.player ? battle.player.id : null,
    founderPackUrl: process.env.FOUNDER_PACK_URL || '',
    demoMode: process.env.DEMO_MODE === 'true' || !process.env.DATABASE_URL
  });
});

router.get('/api/demo/teddies', (req, res) => {
  res.json({ teddies: DEMO_TEDDIES });
});

router.post('/api/demo/battle', (req, res) => {
  const playerTeddy = getDemoTeddyById(req.body.teddyId) || DEMO_TEDDIES[0];
  const opponentTeddy = pickOpponent(playerTeddy._id);
  res.json(autoBattle(playerTeddy, opponentTeddy));
});

module.exports = router;
