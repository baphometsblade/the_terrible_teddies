require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('MongoDB connected successfully');
    updateTeddyData();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
  });

const teddiesToUpdate = [
  {
    "_id": "507f191e810c19729de860ea",
    "name": "Tipsy Teddy",
    "description": "Always ready for a party, this bear knows how to lift the spirits.",
    "attackDamage": 18,
    "health": 85,
    "specialMove": "Boozy Bash",
    "rarity": "Rare",
    "theme": "Party",
    "humorStyle": "Raunchy",
    "role": "Bard",
    "interactionStyle": "Boisterous",
    "voiceLine": "Let's get this party stumbling!",
    "collectibilityFactor": 6
  },
  {
    "_id": "507f191e810c19729de860eb",
    "name": "Flirtatious Furball",
    "description": "With a wink and a smile, this teddy can charm anyone.",
    "attackDamage": 15,
    "health": 90,
    "specialMove": "Charm Offensive",
    "rarity": "Uncommon",
    "theme": "Love",
    "humorStyle": "Cheeky",
    "role": "Scout",
    "interactionStyle": "Flirtatious",
    "voiceLine": "Did it hurt when you fell from heaven?",
    "collectibilityFactor": 7
  },
  {
    "_id": "507f191e810c19729de860ec",
    "name": "Gambler Grizzly",
    "description": "A risky bear who bets it all and sometimes wins big.",
    "attackDamage": 22,
    "health": 70,
    "specialMove": "High Stakes Hit",
    "rarity": "Legendary",
    "theme": "Gambling",
    "humorStyle": "Sarcastic",
    "role": "Warrior",
    "interactionStyle": "Daring",
    "voiceLine": "I bet you didn't see this coming!",
    "collectibilityFactor": 8
  },
  {
    "_id": "507f191e810c19729de860ed",
    "name": "Sassy Snuggler",
    "description": "Don't let the cuddles fool you, this bear's got an attitude.",
    "attackDamage": 20,
    "health": 80,
    "specialMove": "Sass Blast",
    "rarity": "Rare",
    "theme": "Attitude",
    "humorStyle": "Witty",
    "role": "Assassin",
    "interactionStyle": "Sarcastic",
    "voiceLine": "You call that a fight?",
    "collectibilityFactor": 5
  },
  {
    "_id": "507f191e810c19729de860ee",
    "name": "Brawny Brewmaster",
    "description": "This bear brews a mean potion... and throws it right at you.",
    "attackDamage": 25,
    "health": 75,
    "specialMove": "Brew Toss",
    "rarity": "Uncommon",
    "theme": "Brewing",
    "humorStyle": "Dry",
    "role": "Mage",
    "interactionStyle": "Direct",
    "voiceLine": "Hope you like your potions strong!",
    "collectibilityFactor": 6
  },
  {
    "_id": "507f191e810c19729de860ef",
    "name": "Ninja Nightbear",
    "description": "Silent but deadly, this bear knows how to party after dark.",
    "attackDamage": 19,
    "health": 90,
    "specialMove": "Midnight Maul",
    "rarity": "Legendary",
    "theme": "Nightlife",
    "humorStyle": "Ironic",
    "role": "Assassin",
    "interactionStyle": "Stealthy",
    "voiceLine": "The night is dark and full of teddies.",
    "collectibilityFactor": 9
  },
  {
    "_id": "507f191e810c19729de860f0",
    "name": "Punk Pandemonium",
    "description": "Rebellious and rowdy, this bear doesn't play by the rules.",
    "attackDamage": 21,
    "health": 85,
    "specialMove": "Anarchic Assault",
    "rarity": "Rare",
    "theme": "Rebellion",
    "humorStyle": "Snarky",
    "role": "Warrior",
    "interactionStyle": "Rebellious",
    "voiceLine": "Time to tear it all down!",
    "collectibilityFactor": 7
  },
  {
    "_id": "507f191e810c19729de860f1",
    "name": "Mystic Mixologist",
    "description": "This bear concocts mystical brews that bewilder and bedazzle.",
    "attackDamage": 17,
    "health": 92,
    "specialMove": "Mystical Mix",
    "rarity": "Uncommon",
    "theme": "Mysticism",
    "humorStyle": "Mysterious",
    "role": "Mage",
    "interactionStyle": "Enigmatic",
    "voiceLine": "Prepare to be mystified!",
    "collectibilityFactor": 5
  },
  {
    "_id": "507f191e810c19729de860f2",
    "name": "Diva Darebear",
    "description": "With dazzling style and dramatic flair, this bear steals the spotlight.",
    "attackDamage": 16,
    "health": 88,
    "specialMove": "Glamour Slam",
    "rarity": "Legendary",
    "theme": "Glamour",
    "humorStyle": "Flamboyant",
    "role": "Bard",
    "interactionStyle": "Dramatic",
    "voiceLine": "The stage is mine!",
    "collectibilityFactor": 8
  },
  {
    "_id": "507f191e810c19729de860f3",
    "name": "Rogue Romancer",
    "description": "A charming bear with a penchant for stealing hearts... and wallets.",
    "attackDamage": 18,
    "health": 77,
    "specialMove": "Heartbreaker Hit",
    "rarity": "Rare",
    "theme": "Romance",
    "humorStyle": "Playful",
    "role": "Thief",
    "interactionStyle": "Charming",
    "voiceLine": "Did someone order a heart theft?",
    "collectibilityFactor": 6
  }
  // ... Include the rest of the teddy data provided by the user ...
];

async function updateTeddyData() {
  try {
    for (const teddyData of teddiesToUpdate) {
      if (!mongoose.Types.ObjectId.isValid(teddyData._id)) {
        console.error(`Invalid ID: ${teddyData._id}`);
        continue;
      }
      const result = await Teddy.findByIdAndUpdate(new mongoose.Types.ObjectId(teddyData._id), teddyData, { new: true, upsert: true });
      if (result) {
        console.log(`Updated teddy: ${result.name}`);
      } else {
        console.log(`Teddy not found with ID: ${teddyData._id}, a new teddy has been created.`);
      }
    }
    console.log('All teddies have been updated successfully');
  } catch (error) {
    console.error('Error updating teddies:', error.message, error.stack);
  } finally {
    mongoose.connection.close();
  }
}