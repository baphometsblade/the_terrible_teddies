// gameLogic.js
//
// Persistence-aware layer over the pure battle engine in services/battleEngine.js.
// The engine stays free of I/O so it remains easy to test; everything that needs
// the database lives here.

const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');
const Boss = require('./models/Boss');
const Arena = require('./models/Arena');
const Event = require('./models/Event');
const logger = require('./config/loggingConfig');
const battleEngine = require('./services/battleEngine');

const XP_FOR_WIN = 25;
const XP_FOR_LOSS = 10;

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Load teddies by id, preserving the order they were requested in so a chosen
 * lineup keeps its intended slot order.
 */
async function loadTeddiesByIds(ids) {
  const requested = (Array.isArray(ids) ? ids : []).filter(isValidId);
  if (!requested.length) {
    return [];
  }

  const found = await Teddy.find({ _id: { $in: requested } });
  const byId = new Map(found.map((teddy) => [String(teddy._id), teddy]));

  return requested
    .map((id) => byId.get(String(id)))
    .filter(Boolean);
}

/**
 * Award experience after a battle. Battle HP is deliberately NOT persisted -
 * teddies heal between battles; only progression carries over.
 */
async function saveTeddyProgress(fighter, { won = false } = {}) {
  if (!fighter || !isValidId(fighter.id)) {
    return null;
  }

  try {
    return await levelUpTeddy(fighter.id, won ? XP_FOR_WIN : XP_FOR_LOSS);
  } catch (error) {
    // Progression must never fail a battle response.
    logger.error('Could not save teddy progress', {
      teddyId: fighter.id,
      error: error.message
    });
    return null;
  }
}

async function levelUpTeddy(teddyId, experiencePoints) {
  const teddy = await Teddy.findById(teddyId);
  if (!teddy) {
    throw new Error('Teddy not found');
  }

  teddy.experience += experiencePoints;

  while (teddy.experience >= 100) {
    teddy.level += 1;
    teddy.health += 10;
    teddy.attackDamage += 5;
    teddy.experience -= 100;
    logger.info(`Teddy ${teddy.name} leveled up to level ${teddy.level}`);
  }

  await teddy.save();
  return teddy;
}

/**
 * Build a battle between a stored teddy and the boss guarding an end-game arena.
 */
async function initiateEndGameBattle(playerTeddyId, arenaId) {
  if (!isValidId(playerTeddyId) || !isValidId(arenaId)) {
    throw new Error('A valid teddy id and arena id are required');
  }

  const [teddy, arena] = await Promise.all([
    Teddy.findById(playerTeddyId),
    Arena.findById(arenaId)
  ]);

  if (!teddy) throw new Error('Teddy not found');
  if (!arena) throw new Error('Arena not found');

  const boss = await Boss.findOne({ arena: arena._id });
  if (!boss) {
    throw new Error(`No boss is assigned to arena ${arena.name}`);
  }

  const battle = battleEngine.createBattle(teddy.toObject(), {
    _id: boss._id,
    name: boss.name,
    health: boss.health,
    attackDamage: boss.attackDamage,
    specialMove: boss.specialMove,
    rarity: 'Legendary',
    voiceLine: `${boss.name} blocks the way.`
  });

  return { ...battle, arena: { id: String(arena._id), name: arena.name, environment: arena.environment } };
}

async function initiateBossFight(playerId, bossId) {
  if (!isValidId(bossId)) {
    throw new Error('A valid boss id is required');
  }

  const boss = await Boss.findById(bossId).populate('arena');
  if (!boss) {
    throw new Error('Boss not found');
  }

  const teddies = await Teddy.find({ owner: playerId });
  const playerAttack = teddies.reduce((total, teddy) => total + teddy.attackDamage, 0);

  const victory = playerAttack > boss.health;
  return {
    victory,
    message: victory
      ? `You defeated ${boss.name}!`
      : `You were defeated by ${boss.name}...`
  };
}

async function loadActiveEvents() {
  const now = new Date();
  return Event.find({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } });
}

module.exports = {
  // persistence
  loadTeddiesByIds,
  saveTeddyProgress,
  levelUpTeddy,
  loadActiveEvents,
  // battles
  initiateBattle: battleEngine.createBattle,
  executeTurn: battleEngine.executeTurn,
  initiateEndGameBattle,
  initiateBossFight
};
