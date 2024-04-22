require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy'); // Assuming Teddy model exists and is in the models directory
const MarketItem = require('./models/MarketItem'); // Assuming MarketItem model exists and is in the models directory

mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('MongoDB connected for item population'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.error(err.stack);
  });

const itemsData = [
  {
    name: "Magic Wand",
    description: "Increases attack power by 20%",
    effect: { attackBoost: 0.2 },
    rarity: "Rare"
  },
  {
    name: "Healing Potion",
    description: "Restores 30 health points",
    effect: { healthRestore: 30 },
    rarity: "Common"
  },
  // Add more items as needed
];

const populateItems = async () => {
  try {
    // Fetch a default user and teddy to assign to items
    const defaultUser = await mongoose.model('User').findOne();
    const defaultTeddy = await mongoose.model('Teddy').findOne();

    if (!defaultUser || !defaultTeddy) {
      throw new Error('Default user or teddy not found. Ensure at least one user and teddy are in the database.');
    }

    for (const itemData of itemsData) {
      const item = new MarketItem({
        owner: defaultUser._id, // Link to an existing user
        teddy: defaultTeddy._id, // Link to an existing teddy
        price: 100, // Default price, adjust as necessary
        status: 'available',
        ...itemData
      });
      await item.save();
      console.log(`Item ${item.name} saved successfully`);
    }
  } catch (error) {
    console.error('Error populating items:', error.message);
    console.error(error.stack);
  } finally {
    mongoose.disconnect().then(() => console.log('MongoDB disconnected after item population'));
  }
};

populateItems();