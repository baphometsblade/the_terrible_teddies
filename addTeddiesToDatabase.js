require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

const teddiesToAdd = [
  // Mythic Teddies
  {
    "name": "Aetherclaw the Mystic",
    "description": "Wielding cosmic energies with a naughty wink, Aetherclaw knows how to use his powers to enchant and beguile.",
    "attackDamage": 28,
    "health": 90,
    "specialMove": "Celestial Tease",
    "rarity": "Mythic",
    "theme": "Celestial",
    "humorStyle": "Naughty",
    "role": "Enchanter",
    "interactionStyle": "Bewitching",
    "voiceLine": "Let the stars align in delight.",
    "collectibilityFactor": 10
  },
  {
    "name": "Loki Paws",
    "description": "The mischievous trickster bear who loves to play naughty pranks on the gods and mortals alike.",
    "attackDamage": 26,
    "health": 88,
    "specialMove": "Mischief Mirage",
    "rarity": "Mythic",
    "theme": "Deception",
    "humorStyle": "Prankish",
    "role": "Trickster",
    "interactionStyle": "Sly",
    "voiceLine": "Let's turn mischief into pleasure.",
    "collectibilityFactor": 10
  },
  {
    "name": "Valkyrie Vixen",
    "description": "This warrior goddess bear chooses the bravest from the battlefield, offering them a place in her racy realm.",
    "attackDamage": 30,
    "health": 92,
    "specialMove": "Sensual Selection",
    "rarity": "Mythic",
    "theme": "Warrior",
    "humorStyle": "Bold",
    "role": "Chooser of the Slain",
    "interactionStyle": "Daring",
    "voiceLine": "Join me in a valiant venture of vice.",
    "collectibilityFactor": 10
  },
  // ... Add the rest of the teddies provided by the user ...
  // Historic Teddies
  // ... Add historic teddies here ...
  // Job Teddies
  // ... Add job teddies here ...
  // Child Teddies
  // ... Add child teddies here ...
  // Adult Teddies
  // ... Add adult teddies here ...
];

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected successfully');
    addTeddies();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
  });

async function addTeddies() {
  try {
    for (const teddyData of teddiesToAdd) {
      const existingTeddy = await Teddy.findOne({ name: teddyData.name });
      if (!existingTeddy) {
        const newTeddy = new Teddy(teddyData);
        await newTeddy.save();
        console.log(`Added new teddy: ${newTeddy.name}`);
      } else {
        console.log(`Teddy with name ${teddyData.name} already exists. Updating existing teddy.`);
        await Teddy.findOneAndUpdate({ name: teddyData.name }, teddyData, { new: true, upsert: true });
        console.log(`Updated teddy: ${teddyData.name}`);
      }
    }
    console.log('All teddies have been processed');
  } catch (error) {
    console.error('Error adding teddies:', error.message, error.stack);
  } finally {
    mongoose.connection.close();
  }
}