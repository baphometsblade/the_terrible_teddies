const test = require('node:test');
const assert = require('node:assert/strict');

const { DEMO_TEDDIES } = require('../data/demoTeddies');
const {
  createBattle,
  executeTurn,
  autoBattle,
  calculateDamage,
  chooseOpponentMove,
  createRng,
  MAX_LOG_ENTRIES
} = require('../services/battleEngine');

const [A, B] = DEMO_TEDDIES;

function playOut(seed, moves = ['attack', 'special']) {
  let battle = createBattle(A, B, { seed });
  let i = 0;
  while (battle.status === 'active' && i < 50) {
    battle = executeTurn(battle, moves[i % moves.length]);
    i++;
  }
  return battle;
}

// --- reproducibility -------------------------------------------------------
// Battle state is stored in the session between requests, so a turn must be a
// pure function of (state, move). If it were not, a replayed or retried POST
// would diverge - and a player could re-roll a bad turn by resubmitting.

test('the same seed always produces an identical battle', () => {
  const first = playOut(12345);
  const second = playOut(12345);

  assert.equal(first.winner, second.winner);
  assert.equal(first.turn, second.turn);
  assert.deepEqual(first.log, second.log);
  assert.equal(first.player.health, second.player.health);
});

test('executeTurn is pure - running it twice on one state gives one result', () => {
  const battle = createBattle(A, B, { seed: 777 });

  const once = executeTurn(battle, 'attack');
  const twice = executeTurn(battle, 'attack');

  assert.deepEqual(once, twice, 'a resubmitted turn must not re-roll');
  assert.equal(battle.turn, 1, 'the input state must not be mutated');
  assert.equal(battle.rngStep, 0, 'the input state must not be mutated');
});

test('each turn advances the rng step so turns differ from one another', () => {
  const battle = createBattle(A, B, { seed: 42 });
  const t1 = executeTurn(battle, 'attack');
  const t2 = executeTurn(t1, 'attack');

  assert.equal(battle.rngStep, 0);
  assert.equal(t1.rngStep, 1);
  assert.equal(t2.rngStep, 2);
});

// --- actual variance -------------------------------------------------------

test('different seeds produce different battles', () => {
  // The old engine used (turn % 3) - 1, so every matchup played out identically
  // every single time.
  const results = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const b = playOut(seed);
    results.add(`${b.winner}:${b.turn}:${b.player.health}`);
  }

  assert.ok(results.size > 1, 'battles should not all play out the same way');
});

test('damage varies with the roll', () => {
  const low = calculateDamage(A, B, 'attack', 1, 0).damage;
  const mid = calculateDamage(A, B, 'attack', 1, 0.5).damage;

  assert.ok(low < mid, `expected a low roll (${low}) to hit softer than a neutral one (${mid})`);
});

test('a high roll can land a critical hit', () => {
  const crit = calculateDamage(A, B, 'attack', 1, 0.999);
  const normal = calculateDamage(A, B, 'attack', 1, 0.5);

  assert.equal(crit.critical, true, 'the top of the roll range should crit');
  assert.equal(normal.critical, false);
  assert.ok(crit.damage > normal.damage);
});

test('critical hits are reported in the battle log', () => {
  // Search seeds until one produces a crit, then confirm it is surfaced.
  let found = null;
  for (let seed = 1; seed <= 200 && !found; seed++) {
    const b = playOut(seed);
    if (b.log.some((line) => line.includes('CRITICAL'))) found = b;
  }

  assert.ok(found, 'expected at least one crit across 200 seeded battles');
});

test('the opponent no longer alternates predictably', () => {
  // Old behaviour: turn % 2 === 0 ? 'special' : 'attack'.
  const moves = new Set();
  for (let i = 0; i < 40; i++) {
    moves.add(chooseOpponentMove(cloneOf(B, 100), cloneOf(A, 100), 1, i / 40));
  }

  assert.equal(moves.size, 2, 'the opponent should sometimes attack and sometimes go special');
});

test('a hurt opponent reaches for its special more often', () => {
  const healthy = cloneOf(B, 100);
  const wounded = cloneOf(B, 10);
  const player = cloneOf(A, 100);

  const rate = (fighter) => {
    let specials = 0;
    for (let i = 0; i < 100; i++) {
      if (chooseOpponentMove(fighter, player, 3, i / 100) === 'special') specials++;
    }
    return specials;
  };

  assert.ok(rate(wounded) > rate(healthy), 'a desperate teddy should press its special');
});

function cloneOf(teddy, health) {
  return {
    ...teddy,
    health,
    maxHealth: 100,
    attackDamage: teddy.attackDamage ?? 10,
    strategyLevel: teddy.strategyLevel ?? 50,
    adaptability: teddy.adaptability ?? 50
  };
}

// --- bounds ----------------------------------------------------------------

test('the battle log is capped so sessions cannot grow without bound', () => {
  // The log is stored in the session; unbounded growth bloated every session.
  let battle = createBattle(
    { ...A, health: 100000, attackDamage: 1 },
    { ...B, health: 100000, attackDamage: 1 },
    { seed: 5 }
  );

  for (let i = 0; i < 200 && battle.status === 'active'; i++) {
    battle = executeTurn(battle, 'attack');
  }

  assert.ok(
    battle.log.length <= MAX_LOG_ENTRIES,
    `log grew to ${battle.log.length}, cap is ${MAX_LOG_ENTRIES}`
  );
});

test('autoBattle always terminates and names a winner', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const battle = autoBattle(A, B, undefined, { seed });
    assert.equal(battle.status, 'finished');
    assert.ok(['player', 'opponent'].includes(battle.winner));
  }
});

test('health never goes negative', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const battle = playOut(seed);
    assert.ok(battle.player.health >= 0);
    assert.ok(battle.opponent.health >= 0);
  }
});

// --- the rng itself --------------------------------------------------------

test('createRng is deterministic per seed and spreads across the range', () => {
  const a = createRng(99);
  const b = createRng(99);
  assert.equal(a(), b(), 'same seed, same sequence');

  const rng = createRng(2024);
  const values = Array.from({ length: 1000 }, rng);

  assert.ok(values.every((v) => v >= 0 && v < 1), 'all values must be in [0, 1)');

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  assert.ok(Math.abs(mean - 0.5) < 0.05, `mean ${mean} should sit near 0.5`);

  // Every decile should see some traffic.
  const buckets = new Array(10).fill(0);
  values.forEach((v) => buckets[Math.floor(v * 10)]++);
  assert.ok(buckets.every((count) => count > 0), 'distribution should cover every decile');
});
