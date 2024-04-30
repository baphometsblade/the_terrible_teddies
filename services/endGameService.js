const Arena = require('../models/Arena');
const Boss = require('../models/Boss');
const Teddy = require('../models/Teddy');
const Event = require('../models/Event');
const logger = require('../config/loggingConfig');

async function loadEndGameContent() {
  try {
    const arenas = await Arena.find({ isEndGame: true });
    const bosses = await Boss.find().populate('arena');
    if (!arenas.length || !bosses.length) {
      logger.log('info', 'No end game arenas or bosses found in the database.');
      return { arenas: [], bosses: [] };
    }
    return { arenas, bosses };
  } catch (error) {
    logger.error('Error loading end-game content: %s %s', error.message, error.stack);
    throw error;
  }
}

async function loadActiveEvents() {
  try {
    const now = new Date();
    const events = await Event.find({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } });
    if (!events.length) {
      logger.log('info', 'No active events found.');
      return [];
    }
    return events;
  } catch (error) {
    logger.error('Error loading active events: %s %s', error.message, error.stack);
    throw error;
  }
}

module.exports = {
  loadEndGameContent,
  loadActiveEvents
};