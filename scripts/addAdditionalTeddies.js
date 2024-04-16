const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Teddy = require('../models/Teddy');

dotenv.config();

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err.message, err.stack));

const teddies = [
  // Example teddy for structure, repeat and modify for 50 unique entries
  {
    name: "Grumpy Gus",
    description: "Always wakes up on the wrong side of the bed. Not a morning teddy.",
    attackDamage: 25,
    health: 100,
    specialMove: "Grumble Grunt",
    rarity: "Rare",
    theme: "Grumpy",
    humorStyle: "Sarcastic",
    role: "Tank",
    interactionStyle: "Grumpy",
    voiceLine: "I don't do mornings...",
    collectibilityFactor: 7,
    imagePath: "./images/teddies/grumpy_gus.png"
  },
  {
    name: "Tipsy Toby",
    description: "Famous for his love of fermented honey. Watch out for his drunken fury!",
    attackDamage: 30,
    health: 90,
    specialMove: "Honey Hiccup",
    rarity: "Uncommon",
    theme: "Party",
    humorStyle: "Slapstick",
    role: "Brawler",
    interactionStyle: "Boisterous",
    voiceLine: "Who spilled my honey?!",
    collectibilityFactor: 6,
    imagePath: "./images/teddies/tipsy_toby.png"
  },
  {
    name: "Sneaky Pete",
    description: "Never trust a teddy who hides in shadows. Especially one with a grin like Pete's.",
    attackDamage: 20,
    health: 80,
    specialMove: "Shadow Sneak",
    rarity: "Rare",
    theme: "Mischief",
    humorStyle: "Witty",
    role: "Assassin",
    interactionStyle: "Cunning",
    voiceLine: "Now you see me, now you don't!",
    collectibilityFactor: 8,
    imagePath: "./images/teddies/sneaky_pete.png"
  },
  // Add 47 more teddies with unique attributes and humor
];

async function addTeddies() {
  try {
    for (const teddy of teddies) {
      const newTeddy = new Teddy(teddy);
      await newTeddy.save();
      console.log(`Teddy ${newTeddy.name} added successfully.`);
    }
    console.log('All teddies added to the database.');
  } catch (err) {
    console.error('Error adding teddies to the database:', err.message, err.stack);
  } finally {
    mongoose.disconnect()
      .then(() => console.log('Disconnected from MongoDB'))
      .catch(disconnectErr => console.error('Error disconnecting from MongoDB:', disconnectErr.message, disconnectErr.stack));
  }
}

addTeddies();