const mongoose = require('mongoose');
const Teddy = require('../models/Teddy');
require('dotenv').config();

const teddies = [
  // ... Array of teddy objects ...
  {
    "_id": "unique_id_mythic_1",
    "name": "Aetherclaw the Mystic",
    "description": "Wielding cosmic energies with a naughty wink, Aetherclaw knows how to use his powers to enchant and beguile.",
    "attackDamage": 28,
    "health": 90,
    "specialMove": "Celestial Tease",
    "rarity": "Mythic",
    "theme": "Celestial",
    "humorStyle": "Naughty",
    "role": "Enchanter",
    "interactionStyle": "Bewitching",
    "voiceLine": "Let the stars align in delight.",
    "collectibilityFactor": 10
  },
  // ... Additional teddy objects ...
];

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected...');
    Teddy.insertMany(teddies)
      .then(() => {
        console.log('Teddies added to the database successfully');
        process.exit();
      })
      .catch((error) => {
        console.error('Error adding teddies to the database:', error.message);
        console.error(error.stack);
        process.exit(1);
      });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });