const Arena = require('../models/Arena');
const Boss = require('../models/Boss');
const Teddy = require('../models/Teddy');

async function loadEndGameContent() {
  try {
    const arenas = await Arena.find({ isEndGame: true });
    const bosses = await Boss.find().populate('arena');
    if (!arenas.length || !bosses.length) {
      console.log('No end game arenas or bosses found in the database.');
      return { arenas: [], bosses: [] };
    }
    return { arenas, bosses };
  } catch (error) {
    console.error('Error loading end-game content:', error.message, error.stack);
    throw error;
  }
}

module.exports = {
  loadEndGameContent
};