const mongoose = require('mongoose');
const Teddy = require('../models/Teddy'); // Assuming the Teddy model exists in the models directory
const dotenv = require('dotenv');
const fs = require('fs').promises; // Added to use the file system promises API

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL; // INPUT_REQUIRED {Provide your MongoDB connection string}

mongoose.connect(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connection established'))
  .catch(err => console.error('MongoDB connection error:', err));

const addTeddies = async () => {
  try {
    const data = await fs.readFile('./data/teddies.json', 'utf8'); // Read the teddies data from the JSON file
    const teddies = JSON.parse(data); // Parse the JSON data into an array of objects

    for (const teddyData of teddies) {
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
};

addTeddies();