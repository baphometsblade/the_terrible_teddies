require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

const historicTeddies = [
  {
    "_id": "unique_id_historic_1",
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
  {
    "_id": "unique_id_historic_2",
    "name": "Cleobearta",
    "description": "With a charm that could launch a thousand ships, this bear's allure is as legendary as her reign.",
    "attackDamage": 27,
    "health": 90,
    "specialMove": "Nile's Embrace",
    "rarity": "Legendary",
    "theme": "Egyptian",
    "humorStyle": "Seductive",
    "role": "Queen",
    "interactionStyle": "Charming",
    "voiceLine": "Let's make history... in the sheets.",
    "collectibilityFactor": 10
  },
  {
    "_id": "unique_id_historic_3",
    "name": "Sir Cuddlesalot",
    "description": "A knight so brave and bold, he'd storm the castle gates for a damsel in need of a snuggle.",
    "attackDamage": 25,
    "health": 92,
    "specialMove": "Chivalrous Charm",
    "rarity": "Rare",
    "theme": "Medieval",
    "humorStyle": "Gallant",
    "role": "Knight",
    "interactionStyle": "Valiant",
    "voiceLine": "For honor, for glory, for cuddles!",
    "collectibilityFactor": 8
  },
  // ... (rest of the historic teddies provided by the user with their _id included) ...
];

mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('MongoDB connected successfully');
    addHistoricTeddies();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
  });

async function addHistoricTeddies() {
  const ids = historicTeddies.map(teddy => teddy._id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== historicTeddies.length) {
    console.error('Duplicate _id values found in the historicTeddies array.');
    mongoose.connection.close();
    return;
  }

  try {
    for (const teddyData of historicTeddies) {
      const existingTeddy = await Teddy.findById(teddyData._id).exec();
      if (existingTeddy) {
        console.log(`Teddy already exists: ${teddyData.name}`);
        continue;
      }
      const newTeddy = new Teddy(teddyData);
      await newTeddy.save();
      console.log(`Added new teddy: ${newTeddy.name}`);
    }
    console.log('All historic teddies have been added successfully');
  } catch (error) {
    console.error('Error adding historic teddies:', error.message, error.stack);
  } finally {
    mongoose.connection.close();
  }
}