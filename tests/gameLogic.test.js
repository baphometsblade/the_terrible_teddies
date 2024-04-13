// tests/gameLogic.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { loadTeddiesByIds, saveTeddyProgress, calculateExperiencePoints, checkForLevelUp, handleLevelUpRewards } = require('../gameLogic');
const Teddy = require('../models/Teddy');
const Player = require('../models/Player');
const CombatSystem = require('../combatSystem');

let mongoServer;
let playerTeddy;
let opponentTeddy;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  // Create mock teddies for testing
  playerTeddy = new Teddy({
    name: 'Test Player Teddy',
    description: 'A brave teddy for testing',
    attackDamage: 10,
    health: 100,
    specialMove: 'Heal',
    rarity: 'Common',
    theme: 'Test',
    humorStyle: 'Dry',
    role: 'Hero',
    interactionStyle: 'Friendly',
    voiceLine: 'For testing!',
    collectibilityFactor: 5
  });
  await playerTeddy.save();

  opponentTeddy = new Teddy({
    name: 'Test Opponent Teddy',
    description: 'A fierce teddy for testing',
    attackDamage: 8,
    health: 80,
    specialMove: 'Double Damage',
    rarity: 'Uncommon',
    theme: 'Test',
    humorStyle: 'Sarcastic',
    role: 'Villain',
    interactionStyle: 'Aggressive',
    voiceLine: 'I will defeat you!',
    collectibilityFactor: 5
  });
  await opponentTeddy.save();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('CombatSystem should set up initial battle state', () => {
  const combatSystem = new CombatSystem(playerTeddy, opponentTeddy, false);
  combatSystem.initiateBattle();
  const battleState = combatSystem.getBattleState();
  expect(battleState).toHaveProperty('playerTeddy');
  expect(battleState).toHaveProperty('opponentTeddy');
  expect(battleState).toHaveProperty('turn', 'player');
  expect(battleState).toHaveProperty('winner', null);
});

test('CombatSystem should process player turn', () => {
  const combatSystem = new CombatSystem(playerTeddy, opponentTeddy, false);
  combatSystem.initiateBattle();
  combatSystem.executePlayerTurn('attack');
  let battleState = combatSystem.getBattleState();
  expect(battleState.opponentTeddy.currentHealth).toBeLessThan(opponentTeddy.health);
  expect(battleState.turn).toBe('opponent');
});

test('CombatSystem should process opponent turn', () => {
  const combatSystem = new CombatSystem(playerTeddy, opponentTeddy, true);
  combatSystem.initiateBattle();
  combatSystem.executePlayerTurn('attack');
  combatSystem.executeOpponentTurn();
  let battleState = combatSystem.getBattleState();
  expect(battleState.turn).toBe('player');
});

test('loadTeddiesByIds should load teddies from the database', async () => {
  const teddies = await loadTeddiesByIds([playerTeddy._id, opponentTeddy._id]);
  expect(teddies.length).toBe(2);
});

test('saveTeddyProgress should save teddy health to the database', async () => {
  const updatedHealth = 80;
  playerTeddy.currentHealth = updatedHealth;
  await saveTeddyProgress(playerTeddy);
  const updatedTeddy = await Teddy.findById(playerTeddy._id);
  expect(updatedTeddy.health).toBe(updatedHealth);
});

test('calculateExperiencePoints should return correct experience points', () => {
  const experiencePoints = calculateExperiencePoints(playerTeddy, opponentTeddy);
  expect(experiencePoints).toBeGreaterThan(0);
});

test('checkForLevelUp should level up player if enough experience points', () => {
  const player = new Player({ experiencePoints: 40, level: 1 });
  checkForLevelUp(player);
  expect(player.level).toBe(2);
});

test('handleLevelUpRewards should give rewards to player on level up', () => {
  const player = new Player({ level: 1, currency: 0 });
  handleLevelUpRewards(player);
  expect(player.currency).toBeGreaterThan(0);
});