require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

const adultTeddies = [
  {
    "_id": new mongoose.Types.ObjectId(),
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
  // ... Add the rest of the adult-themed teddies provided by the user ...
];

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected successfully');
    addAdultTeddies();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
  });

async function addAdultTeddies() {
  try {
    for (const teddyData of adultTeddies) {
      const newTeddy = new Teddy({
        ...teddyData,
        _id: new mongoose.Types.ObjectId() // Ensure unique _id for each teddy
      });
      const result = await newTeddy.save();
      console.log(`Added new adult-themed teddy: ${result.name}`);
    }
    console.log('All adult-themed teddies have been added successfully');
  } catch (error) {
    console.error('Error adding adult-themed teddies:', error.message, error.stack);
  } finally {
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
    });
  }
}