// constants.js

// Constants for game logic and combat system
const EXPERIENCE_BASE = 10; // Base experience points for the game
const LEVEL_UP_BASE = 20; // Base experience required for leveling up
const RARITY_MULTIPLIER = {
  'Common': 1,
  'Uncommon': 1.5,
  'Rare': 2,
  'Legendary': 3,
  'Mythic': 4 // Adjusted rarity multipliers for game balance
};
const VALID_PLAYER_MOVES = ['attack', 'special']; // List of valid player moves
const ATTACK_DAMAGE_BASE = 5; // Base attack damage for teddies
const HEALTH_BASE = 100; // Base health points for teddies
const SPECIAL_MOVE_EFFECTS = {
  'doubleDamage': 'Deal double damage on the next attack',
  'heal': 'Heal a certain amount of health points',
  'stun': 'Stun the opponent for one turn'
}; // Special move effects for teddies
const AI_STRATEGY = {
  'aggressive': 'Prioritize attack moves when health is high',
  'defensive': 'Prioritize healing and defensive moves when health is low'
}; // Strategy patterns for AI behavior

module.exports = {
  EXPERIENCE_BASE,
  LEVEL_UP_BASE,
  RARITY_MULTIPLIER,
  VALID_PLAYER_MOVES,
  ATTACK_DAMAGE_BASE,
  HEALTH_BASE,
  SPECIAL_MOVE_EFFECTS,
  AI_STRATEGY
};