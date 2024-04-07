require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected successfully');
    populateDatabase();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
  });

function populateDatabase() {
  const teddiesData = [
    // Example teddy bear data
    {
      name: 'Fluffy Destroyer',
      description: 'A teddy bear with a surprisingly destructive nature.',
      attackDamage: 25,
      health: 100,
      specialMove: 'Fluffpocalypse',
      rarity: 'Legendary',
      theme: 'Destruction',
      humorStyle: 'Dark',
      role: 'Warrior',
      interactionStyle: 'Aggressive',
      voiceLine: 'Prepare for the fluff!',
      collectibilityFactor: 10
    },
    // Add more teddy bear data objects here
    // Additional teddy bear data objects
    {
      name: 'Cuddly Striker',
      description: 'A swift and cuddly teddy that strikes fear into the hearts of its foes.',
      attackDamage: 20,
      health: 80,
      specialMove: 'Cuddle Strike',
      rarity: 'Rare',
      theme: 'Speed',
      humorStyle: 'Witty',
      role: 'Assassin',
      interactionStyle: 'Sneaky',
      voiceLine: 'Hug this!',
      collectibilityFactor: 8
    },
    {
      name: 'Bubbly Blaster',
      description: 'This teddy loves to blow bubbles, especially if they explode.',
      attackDamage: 30,
      health: 90,
      specialMove: 'Bubble Blast',
      rarity: 'Uncommon',
      theme: 'Water',
      humorStyle: 'Silly',
      role: 'Mage',
      interactionStyle: 'Joyful',
      voiceLine: 'Bubble trouble!',
      collectibilityFactor: 7
    },
    // ... Add additional teddy bear data to reach 50 unique characters
  ];

  Teddy.insertMany(teddiesData)
    .then(() => {
      console.log('Database has been populated with initial teddy bear data');
      process.exit();
    })
    .catch((err) => {
      console.error('Error populating database with teddy bear data:', err.message, err.stack);
      process.exit(1);
    });
}