require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('MongoDB connected successfully');
    populateDatabase();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
  });

async function populateDatabase() {
  const teddiesData = [
    // ... (other existing teddy data objects) ...
    // New teddy data objects provided by the user
    {
      "_id": "507f191e810c19729de86112",
      "name": "Amaretto Alchemist",
      "description": "Mixing potions and drinks with equal flair, this teddy conjures up concoctions that delight and dazzle.",
      "attackDamage": 23,
      "health": 88,
      "specialMove": "Syrupy Spell",
      "rarity": "Uncommon",
      "theme": "Amaretto",
      "humorStyle": "Sweet",
      "role": "Alchemist",
      "interactionStyle": "Inventive",
      "voiceLine": "Sweetness with a kick, just like me!",
      "collectibilityFactor": 6
    },
    // ... (additional new teddy data objects) ...
  ];

  for (const teddyData of teddiesData) {
    try {
      const { name, _id, ...updateData } = teddyData;
      let teddyId = _id;
      if (!mongoose.Types.ObjectId.isValid(teddyId)) {
        console.error(`Invalid ID: ${teddyId} for teddy ${name}. Generating a new one.`);
        teddyId = new mongoose.Types.ObjectId();
      }

      const existingTeddy = await Teddy.findOne({ _id: teddyId });
      if (existingTeddy) {
        // Update existing teddy
        await Teddy.findByIdAndUpdate(teddyId, updateData);
        console.log(`Updated teddy: ${name}`);
      } else {
        // Insert new teddy with the provided or new ObjectId
        const newTeddy = new Teddy({ _id: teddyId, name, ...updateData });
        await newTeddy.save();
        console.log(`Inserted new teddy: ${name}`);
      }
    } catch (err) {
      console.error('Error processing teddy:', err.message, err.stack);
    }
  }
  console.log('All teddies have been processed successfully');
}