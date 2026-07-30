// Pure battle engine. No I/O, no database, no randomness that cannot be
// reproduced - all of which keeps it fast to test and safe to run per request.
//
// Randomness is SEEDED rather than drawn from Math.random(). Battle state lives
// in the session between requests, so executeTurn must be a pure function of
// (state, move): the same state and move must always produce the same outcome.
// A bare Math.random() would make a replayed or retried request diverge, and
// would let a player re-roll a bad turn by resubmitting the form.

const MAX_LOG_ENTRIES = 40;
const CRIT_CHANCE = 0.12;
const CRIT_MULTIPLIER = 1.5;
const DAMAGE_VARIANCE = 0.15; // +/- 15%

/**
 * mulberry32 - small, fast, well-distributed PRNG.
 * Returns a function producing floats in [0, 1).
 */
function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cloneFighter(teddy) {
  if (!teddy || !teddy.name) {
    throw new Error('A valid teddy is required');
  }

  // ?? not ||: a teddy with 0 health (or 0 attack) is a real value, and || was
  // silently replacing it with the default, so a knocked-out teddy entered the
  // pit at full health.
  const health = Number(teddy.health ?? 100);

  return {
    id: String(teddy._id || teddy.id || teddy.name),
    name: teddy.name,
    maxHealth: health,
    health,
    attackDamage: Number(teddy.attackDamage ?? 10),
    specialMove: teddy.specialMove || 'Stuffing Strike',
    rarity: teddy.rarity || 'Common',
    strategyLevel: Number(teddy.strategyLevel ?? 50),
    adaptability: Number(teddy.adaptability ?? 50),
    voiceLine: teddy.voiceLine || 'Prepare for fluff.'
  };
}

function rarityBonus(rarity) {
  const bonuses = {
    Common: 0,
    Uncommon: 2,
    Rare: 4,
    Legendary: 7
  };
  return bonuses[rarity] || 0;
}

/**
 * Damage for one blow.
 *
 * `roll` is a number in [0, 1) - pass one from a seeded RNG. It defaults to 0.5
 * (a neutral roll, no crit, no variance) so callers that only want the base
 * calculation, including existing tests, behave deterministically.
 *
 * Returns { damage, critical }.
 */
function calculateDamage(attacker, defender, move = 'attack', turn = 1, roll = 0.5) {
  const base = attacker.attackDamage + rarityBonus(attacker.rarity);
  const strategyBonus = Math.floor(attacker.strategyLevel / 25);
  const defenseOffset = Math.floor(defender.adaptability / 40);
  const specialMultiplier = move === 'special' ? 1.45 : 1;

  const raw = (base + strategyBonus - defenseOffset) * specialMultiplier;

  // Map the roll onto a +/- DAMAGE_VARIANCE swing.
  const variance = 1 + (roll * 2 - 1) * DAMAGE_VARIANCE;

  // A high roll crits. Higher strategy widens the crit window slightly, so the
  // stat matters beyond flat damage.
  const critWindow = CRIT_CHANCE + attacker.strategyLevel / 2000;
  const critical = roll > 1 - critWindow;

  const damage = Math.max(1, Math.round(raw * variance * (critical ? CRIT_MULTIPLIER : 1)));
  return { damage, critical };
}

/**
 * Choose the opponent's move.
 *
 * Previously `turn % 2 === 0 ? 'special' : 'attack'` - perfectly predictable, so
 * a player could always plan around it. Now it leans on the special when hurt
 * or when the fight is dragging, with a random component.
 */
function chooseOpponentMove(opponent, player, turn, roll) {
  const healthRatio = opponent.maxHealth > 0 ? opponent.health / opponent.maxHealth : 0;

  let specialChance = 0.35;
  if (healthRatio < 0.35) specialChance += 0.3; // desperate
  if (turn >= 5) specialChance += 0.1; // finish it
  if (player.health <= opponent.attackDamage * 2) specialChance += 0.15; // going for the kill

  return roll < Math.min(specialChance, 0.9) ? 'special' : 'attack';
}

function appendLog(log, entry) {
  log.push(entry);
  // The log lives in the session and previously grew without bound; a long
  // battle could bloat every stored session.
  if (log.length > MAX_LOG_ENTRIES) {
    log.splice(0, log.length - MAX_LOG_ENTRIES);
  }
  return log;
}

function createBattle(playerTeddy, opponentTeddy, options = {}) {
  const player = cloneFighter(playerTeddy);
  const opponent = cloneFighter(opponentTeddy);

  // An explicit seed makes a battle exactly reproducible, which tests and
  // replays rely on. Otherwise pick one.
  const seed = Number.isInteger(options.seed)
    ? options.seed >>> 0
    : (Math.random() * 0xffffffff) >>> 0;

  return {
    turn: 1,
    status: 'active',
    winner: null,
    seed,
    rngStep: 0,
    player,
    opponent,
    log: [
      `${player.name} enters the fluff pit.`,
      `${opponent.name} answers with ${opponent.voiceLine}`
    ]
  };
}

function executeTurn(battle, playerMove = 'attack') {
  if (!battle || battle.status !== 'active') {
    return battle;
  }

  const next = JSON.parse(JSON.stringify(battle));

  // Derive this turn's randomness from the battle seed plus how many turns have
  // been taken. Same state in, same numbers out - so a resubmitted request
  // cannot re-roll a bad result.
  const rng = createRng((next.seed >>> 0) + (next.rngStep >>> 0) * 0x9e3779b9);
  next.rngStep += 1;

  const playerHit = calculateDamage(next.player, next.opponent, playerMove, next.turn, rng());
  next.opponent.health = Math.max(0, next.opponent.health - playerHit.damage);

  const playerMoveName = playerMove === 'special' ? next.player.specialMove : 'Basic Bonk';
  appendLog(
    next.log,
    playerHit.critical
      ? `${next.player.name} lands a CRITICAL ${playerMoveName} for ${playerHit.damage} damage!`
      : `${next.player.name} uses ${playerMoveName} for ${playerHit.damage} damage.`
  );

  if (next.opponent.health <= 0) {
    next.status = 'finished';
    next.winner = 'player';
    appendLog(next.log, `${next.opponent.name} bursts into dramatic stuffing. You win.`);
    return next;
  }

  const opponentMove = chooseOpponentMove(next.opponent, next.player, next.turn, rng());
  const opponentHit = calculateDamage(next.opponent, next.player, opponentMove, next.turn, rng());
  next.player.health = Math.max(0, next.player.health - opponentHit.damage);

  const opponentMoveName = opponentMove === 'special' ? next.opponent.specialMove : 'Counter Cuddle';
  appendLog(
    next.log,
    opponentHit.critical
      ? `${next.opponent.name} lands a CRITICAL ${opponentMoveName} for ${opponentHit.damage} damage!`
      : `${next.opponent.name} uses ${opponentMoveName} for ${opponentHit.damage} damage.`
  );

  if (next.player.health <= 0) {
    next.status = 'finished';
    next.winner = 'opponent';
    appendLog(next.log, `${next.player.name} is flattened into premium carpet fluff. You lose.`);
    return next;
  }

  next.turn += 1;
  return next;
}

function autoBattle(playerTeddy, opponentTeddy, movePlan = ['attack', 'special', 'attack', 'special'], options = {}) {
  let battle = createBattle(playerTeddy, opponentTeddy, options);
  let moveIndex = 0;

  while (battle.status === 'active' && battle.turn <= 20) {
    battle = executeTurn(battle, movePlan[moveIndex % movePlan.length]);
    moveIndex += 1;
  }

  if (battle.status === 'active') {
    battle.status = 'finished';
    battle.winner = battle.player.health >= battle.opponent.health ? 'player' : 'opponent';
    appendLog(battle.log, 'The judges call time and award victory by remaining fluff mass.');
  }

  return battle;
}

module.exports = {
  cloneFighter,
  calculateDamage,
  createBattle,
  executeTurn,
  autoBattle,
  chooseOpponentMove,
  createRng,
  MAX_LOG_ENTRIES
};
