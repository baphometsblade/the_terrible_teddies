require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

const jobTeddies = [
  // ... (job-themed teddies array as provided by the user) ...
];

mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('MongoDB connected successfully');
    addJobTeddies();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.error(err.stack);
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
  }
}