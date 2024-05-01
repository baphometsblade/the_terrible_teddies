const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Arena = require('../models/Arena');
const Boss = require('../models/Boss');
const Event = require('../models/Event');

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL; // INPUT_REQUIRED {Provide your MongoDB connection string}

mongoose.connect(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected for seeding events and bosses...'))
  .catch(err => console.error('MongoDB connection error:', err.message, err.stack));

const arenas = [
  {
    name: "Thunderdome",
    difficulty: 5,
    environment: "Desert",
    isEndGame: true
  },
  // Add more arenas as needed
];

const bosses = [
  {
    name: "Gigantor the Feared",
    health: 1000,
    attackDamage: 100,
    specialMove: "Thunder Strike",
    arena: "" // This will be populated with the Arena ID
  },
  // Add more bosses as needed
];

const events = [
  {
    title: "The Great Teddy War",
    description: "A battle of epic proportions among teddies.",
    startDate: new Date(2023, 0, 1),
    endDate: new Date(2023, 1, 1),
    isActive: true
  },
  // Add more events as needed
];

async function seedDB() {
  try {
    await Arena.deleteMany({});
    console.log('Arenas collection cleared.');

    await Boss.deleteMany({});
    console.log('Bosses collection cleared.');

    await Event.deleteMany({});
    console.log('Events collection cleared.');

    for (const arenaData of arenas) {
      const arena = new Arena(arenaData);
      await arena.save();
      console.log(`Arena ${arena.name} saved.`);
    }

    const savedArenas = await Arena.find();
    for (const bossData of bosses) {
      const arena = savedArenas[Math.floor(Math.random() * savedArenas.length)];
      bossData.arena = arena._id;
      const boss = new Boss(bossData);
      await boss.save();
      console.log(`Boss ${boss.name} saved.`);
    }

    for (const eventData of events) {
      const event = new Event(eventData);
      await event.save();
      console.log(`Event ${event.title} saved.`);
    }

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Seeding error:', error.message, error.stack);
  } finally {
    mongoose.disconnect().then(() => console.log('MongoDB disconnected.'));
  }
}

seedDB();