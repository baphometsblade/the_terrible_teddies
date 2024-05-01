const Arena = require('../models/Arena');
const Boss = require('../models/Boss');
const mongoose = require('mongoose');

exports.getArenas = async (req, res) => {
  try {
    const arenas = await Arena.find();
    const bosses = await Boss.find().populate('arena');
    res.render('arenaGUI', { arenas: arenas, bosses: bosses });
  } catch (error) {
    console.error('Error fetching arenas and bosses:', error);
    res.status(500).send('Error fetching arenas and bosses');
  }
};