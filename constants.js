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

module.exports = {
  EXPERIENCE_BASE,
  LEVEL_UP_BASE,
  RARITY_MULTIPLIER,
  VALID_PLAYER_MOVES
};