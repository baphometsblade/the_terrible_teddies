require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

const teddiesToAdd = [
  {
    "name": "Naughty Naptime Ned",
    "description": "Once a bear who helped children sleep, now he's more interested in what the adults do in bed.",
    "attackDamage": 18,
    "health": 88,
    "specialMove": "Seductive Slumber",
    "rarity": "Uncommon",
    "theme": "Sleep",
    "humorStyle": "Cheeky",
    "role": "Seducer",
    "interactionStyle": "Playful",
    "voiceLine": "Who said bedtime was just for sleep?",
    "collectibilityFactor": 6
  },
  {
    "name": "Mistress Maribear",
    "description": "Dominating the plush world with her charm and whips, Mistress Maribear knows how to keep everyone in line.",
    "attackDamage": 27,
    "health": 85,
    "specialMove": "Dominant Display",
    "rarity": "Legendary",
    "theme": "BDSM",
    "humorStyle": "Commanding",
    "role": "Dominatrix",
    "interactionStyle": "Assertive",
    "voiceLine": "Submit to the cuddle, and you may just earn a pat.",
    "collectibilityFactor": 9
  },
  // ... rest of the teddy objects ...
];

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected successfully');
    return addTeddies();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

async function addTeddies() {
  try {
    for (const teddyData of teddiesToAdd) {
      const newTeddy = new Teddy(teddyData);
      await newTeddy.save();
      console.log(`Added new teddy: ${newTeddy.name}`);
    }
    console.log('All teddies have been added successfully');
  } catch (error) {
    console.error('Error adding teddies:', error.message);
    console.error(error.stack);
  } finally {
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
    });
  }
}