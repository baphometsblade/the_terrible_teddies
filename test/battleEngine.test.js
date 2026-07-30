const test = require('node:test');
const assert = require('node:assert/strict');

const { DEMO_TEDDIES } = require('../data/demoTeddies');
const { createBattle, executeTurn, autoBattle, calculateDamage, cloneFighter } = require('../services/battleEngine');

test('createBattle creates a valid active battle state', () => {
  const battle = createBattle(DEMO_TEDDIES[0], DEMO_TEDDIES[1]);

  assert.equal(battle.status, 'active');
  assert.equal(battle.turn, 1);
  assert.equal(battle.player.name, DEMO_TEDDIES[0].name);
  assert.equal(battle.opponent.name, DEMO_TEDDIES[1].name);
  assert.ok(battle.player.health > 0);
  assert.ok(battle.opponent.health > 0);
  assert.ok(Array.isArray(battle.log));
});

test('calculateDamage always returns positive integer damage', () => {
  const damage = calculateDamage(DEMO_TEDDIES[3], DEMO_TEDDIES[0], 'special', 2);

  assert.equal(Number.isInteger(damage), true);
  assert.ok(damage > 0);
});

test('executeTurn changes health and appends battle log', () => {
  const battle = createBattle(DEMO_TEDDIES[0], DEMO_TEDDIES[1]);
  const next = executeTurn(battle, 'special');

  assert.ok(next.opponent.health < battle.opponent.health);
  assert.ok(next.player.health <= battle.player.health);
  assert.ok(next.log.length > battle.log.length);
});

test('autoBattle always reaches a finished state', () => {
  const battle = autoBattle(DEMO_TEDDIES[2], DEMO_TEDDIES[3]);

  assert.equal(battle.status, 'finished');
  assert.ok(['player', 'opponent'].includes(battle.winner));
});

test('cloneFighter preserves zero stats instead of substituting defaults', () => {
  // Regression: cloneFighter used `teddy.health || 100`, so a teddy on 0 health
  // entered the battle at full health. Same for 0 attack damage.
  const knockedOut = {
    _id: 'ko',
    name: 'Flattened Fred',
    health: 0,
    attackDamage: 0,
    strategyLevel: 0,
    adaptability: 0
  };

  const fighter = cloneFighter(knockedOut);

  assert.equal(fighter.health, 0, '0 health must stay 0');
  assert.equal(fighter.maxHealth, 0, 'maxHealth must match the given health');
  assert.equal(fighter.attackDamage, 0, '0 attack must stay 0');
  assert.equal(fighter.strategyLevel, 0);
  assert.equal(fighter.adaptability, 0);
});

test('cloneFighter still applies defaults when stats are absent', () => {
  const bare = { _id: 'bare', name: 'Plain Pat' };
  const fighter = cloneFighter(bare);

  assert.equal(fighter.health, 100);
  assert.equal(fighter.attackDamage, 10);
  assert.equal(fighter.strategyLevel, 50);
  assert.equal(fighter.adaptability, 50);
});
