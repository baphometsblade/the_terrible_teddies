const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected for seeding challenges'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

const challenges = [
  {
    title: "Teddy Tussle",
    description: "Win 3 battles with any teddy",
    type: "daily",
    difficulty: "easy",
    reward: 100,
    isActive: true
  },
  {
    title: "Epic Encounter",
    description: "Defeat a Legendary teddy in battle",
    type: "weekly",
    difficulty: "hard",
    reward: 500,
    isActive: true
  },
  {
    title: "Collector's Call",
    description: "Collect 5 different teddies",
    type: "daily",
    difficulty: "medium",
    reward: 150,
    isActive: true
  },
  {
    title: "Ultimate Strategist",
    description: "Win a battle without losing any teddies",
    type: "weekly",
    difficulty: "medium",
    reward: 300,
    isActive: true
  }
];

async function seedChallenges() {
  try {
    await Challenge.deleteMany({});
    console.log('Cleared existing challenges.');

    const createdChallenges = await Challenge.insertMany(challenges);
    console.log('Challenges seeded:', createdChallenges.map(ch => ch.title));

    mongoose.disconnect();
    console.log('MongoDB disconnected after seeding.');
  } catch (error) {
    console.error('Error seeding challenges:', error.message);
    console.error(error.stack);
    mongoose.disconnect();
  }
}

seedChallenges();