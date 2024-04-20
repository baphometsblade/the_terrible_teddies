require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

const childTeddies = [
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
  // ... Add the rest of the child-themed teddies provided by the user ...
];

mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('MongoDB connected successfully');
    addChildTeddies();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.error(err.stack);
  });

async function addChildTeddies() {
  try {
    for (const teddyData of childTeddies) {
      const existingTeddy = await Teddy.findOne({ name: teddyData.name }).exec();
      if (existingTeddy) {
        console.log(`Teddy already exists: ${teddyData.name}`);
        continue;
      }
      const newTeddy = new Teddy(teddyData);
      await newTeddy.save();
      console.log(`Added new child-themed teddy: ${newTeddy.name}`);
    }
    console.log('All child-themed teddies have been added successfully');
  } catch (error) {
    console.error('Error adding child-themed teddies:', error.message);
    console.error(error.stack);
  } finally {
    mongoose.connection.close();
  }
}