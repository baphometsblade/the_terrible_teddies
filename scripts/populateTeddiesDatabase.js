require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const Teddy = require('../models/Teddy');
const path = require('path');

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

const populateTeddies = async () => {
  try {
    const teddiesDataPath = path.join(__dirname, '..', 'data', 'teddies.json');
    const teddiesData = JSON.parse(fs.readFileSync(teddiesDataPath, 'utf8'));

    for (const teddyData of teddiesData.teddies) {
      const teddyExists = await Teddy.findOne({ name: teddyData.name });
      if (!teddyExists) {
        const newTeddy = new Teddy(teddyData);
        await newTeddy.save();
        console.log(`Teddy ${newTeddy.name} added to the database.`);
      } else {
        console.log(`Teddy ${teddyData.name} already exists in the database.`);
      }
    }
    console.log('All teddies have been processed.');
  } catch (error) {
    console.error('Error populating teddies to the database:', error.message, error.stack);
  } finally {
    mongoose.connection.close().then(() => console.log('MongoDB connection closed.'));
  }
};

populateTeddies();