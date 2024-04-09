require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

const jobTeddies = [
  {
    "_id": new mongoose.Types.ObjectId(),
    "name": "Dr. Cuddlestein",
    "description": "An esteemed scientist in the field of hugology, he's researched the most effective cuddling techniques.",
    "attackDamage": 22,
    "health": 85,
    "specialMove": "Therapeutic Embrace",
    "rarity": "Rare",
    "theme": "Science",
    "humorStyle": "Intellectual",
    "role": "Scientist",
    "interactionStyle": "Analytical",
    "voiceLine": "Eureka! I've discovered the formula for the perfect cuddle.",
    "collectibilityFactor": 7
  },
  // ... Add the rest of the job-themed teddies provided by the user ...
];

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected successfully');
    addJobTeddies();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
  });

async function addJobTeddies() {
  try {
    for (const teddyData of jobTeddies) {
      const newTeddy = new Teddy(teddyData);
      const result = await newTeddy.save();
      console.log(`Added new job-themed teddy: ${result.name}`);
    }
    console.log('All job-themed teddies have been added successfully');
  } catch (error) {
    console.error('Error adding job-themed teddies:', error.message, error.stack);
  } finally {
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
    });
  }
}