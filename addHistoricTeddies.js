require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

const historicTeddies = [
  {
    "name": "Emperor Bare-us Caesar",
    "description": "A bear so commanding in the cuddle coliseum, he can make any plushy pledge allegiance with just a wink.",
    "attackDamage": 29,
    "health": 94,
    "specialMove": "Imperial Entice",
    "rarity": "Legendary",
    "theme": "Roman",
    "humorStyle": "Authoritative",
    "role": "Emperor",
    "interactionStyle": "Commanding",
    "voiceLine": "Veni, vidi, vellicavi (I came, I saw, I tickled).",
    "collectibilityFactor": 10
  },
  // ... Add the rest of the historic teddies provided by the user ...
];

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected successfully');
    addHistoricTeddies();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
  });

async function addHistoricTeddies() {
  try {
    for (const teddyData of historicTeddies) {
      const newTeddy = new Teddy({
        ...teddyData,
        _id: new mongoose.Types.ObjectId() // Generate new ObjectId for each teddy
      });
      const result = await newTeddy.save();
      console.log(`Added new teddy: ${result.name}`);
    }
    console.log('All historic teddies have been added successfully');
  } catch (error) {
    console.error('Error adding historic teddies:', error.message, error.stack);
  } finally {
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
    });
  }
}