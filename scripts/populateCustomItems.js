const mongoose = require('mongoose');
const Skin = require('../models/Skin');
const Accessory = require('../models/Accessory');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
    populateCustomItems(); // Ensure populateCustomItems is called only after successful connection
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message, err.stack);
  });

const skins = [
  { name: 'Red Fury', imageUrl: '/images/skins/red-fury.png' },
  { name: 'Blue Bliss', imageUrl: '/images/skins/blue-bliss.png' }
];

const accessories = [
  { name: 'Magic Sword', effect: 'Increase attack by 10' },
  { name: 'Healing Amulet', effect: 'Increase health by 20' }
];

async function populateCustomItems() {
  try {
    await Skin.deleteMany({});
    await Accessory.deleteMany({});
    await Skin.insertMany(skins);
    await Accessory.insertMany(accessories);
    console.log('Custom items populated');
  } catch (error) {
    console.error('Error populating custom items:', error.message, error.stack);
  } finally {
    mongoose.disconnect();
  }
}