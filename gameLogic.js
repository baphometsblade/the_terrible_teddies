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
const BattleAward = require('./models/BattleAward');
const logger = require('./config/loggingConfig');
const battleEngine = require('./services/battleEngine');

const XP_FOR_WIN = 25;
const XP_FOR_LOSS = 10;

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// An error the caller caused, carrying the status that describes it, so a route
// can answer 400 or 404 instead of a 500 with a stack trace in the log.
function callerError(status, message) {
  return Object.assign(new Error(message), { status });
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

// Every full 100 experience is a level: +10 health and +5 attack.
const LEVELS = { $floor: { $divide: ['$experience', 100] } };

/**
 * Add experience and apply any level-ups in one atomic update, worked out by
 * MongoDB. This used to read the teddy, add and save, so two battles paying out
 * at the same moment each overwrote the other's experience; the teddies are
 * shared, so two players finishing with the same one at once is ordinary.
 */
async function levelUpTeddy(teddyId, experiencePoints) {
  const before = await Teddy.findOneAndUpdate(
    { _id: teddyId },
    [
      { $set: { experience: { $add: ['$experience', experiencePoints] } } },
      {
        $set: {
          level: { $add: ['$level', LEVELS] },
          health: { $add: ['$health', { $multiply: [LEVELS, 10] }] },
          attackDamage: { $add: ['$attackDamage', { $multiply: [LEVELS, 5] }] },
          experience: { $mod: ['$experience', 100] }
        }
      }
    ],
    { new: false }
  );
  if (!before) {
    throw new Error('Teddy not found');
  }

  const levels = Math.floor((before.experience + experiencePoints) / 100);
  if (levels > 0) {
    logger.info(`Teddy ${before.name} leveled up to level ${before.level + levels}`);
  }
  return Teddy.findById(teddyId);
}

/**
 * Claim the experience payout for a finished battle: true the first time for a
 * given battle, false after that. See models/BattleAward.js. A battle with no
 * id was started before ids existed and pays out as it always did.
 */
async function claimBattleAward(battleId) {
  if (!battleId) {
    return true;
  }
  try {
    await BattleAward.create({ _id: String(battleId) });
    return true;
  } catch (error) {
    if (error.code !== 11000) {
      // Progression must never fail a battle response.
      logger.error('Could not record a battle payout', { battleId, error: error.message });
    }
    return false;
  }
}

/**
 * Build a battle between a stored teddy and the boss guarding an end-game arena.
 */
async function initiateEndGameBattle(playerTeddyId, arenaId) {
  if (!isValidId(playerTeddyId) || !isValidId(arenaId)) {
    throw callerError(400, 'A valid teddy id and arena id are required');
  }

  const [teddy, arena] = await Promise.all([
    Teddy.findById(playerTeddyId),
    Arena.findById(arenaId)
  ]);

  if (!teddy) throw callerError(404, 'Teddy not found');
  if (!arena) throw callerError(404, 'Arena not found');

  const boss = await Boss.findOne({ arena: arena._id });
  if (!boss) {
    throw callerError(404, 'No boss is assigned to that arena');
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
  claimBattleAward,
  loadActiveEvents,
  // battles
  initiateBattle: battleEngine.createBattle,
  executeTurn: battleEngine.executeTurn,
  initiateEndGameBattle,
  initiateBossFight
};
