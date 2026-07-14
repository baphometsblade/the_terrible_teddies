const test = require('node:test');
const assert = require('node:assert/strict');

const { DEMO_TEDDIES } = require('../data/demoTeddies');
const { createBattle, executeTurn, autoBattle, calculateDamage } = require('../services/battleEngine');

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
