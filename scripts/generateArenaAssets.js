import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Arena from '../models/Arena.js';
import Boss from '../models/Boss.js';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_URL = 'https://api.unsplash.com/search/photos';

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

async function fetchImage(keyword) {
  try {
    const response = await fetch(`${UNSPLASH_URL}?query=${keyword}&client_id=${UNSPLASH_ACCESS_KEY}`);
    if (!response.ok) throw new Error('Failed to fetch from Unsplash');
    const data = await response.json();
    return data.results[0].urls.regular;
  } catch (err) {
    console.error('Error fetching image from Unsplash:', err);
    throw err;
  }
}

async function updateArenaAndBossImages() {
  try {
    const arenas = await Arena.find();
    for (const arena of arenas) {
      const imageUrl = await fetchImage(arena.name);
      await Arena.findByIdAndUpdate(arena._id, { $set: { imageUrl: imageUrl } });
      console.log(`Updated image for arena: ${arena.name}`);
    }

    const bosses = await Boss.find().populate('arena');
    for (const boss of bosses) {
      const imageUrl = await fetchImage(boss.name);
      await Boss.findByIdAndUpdate(boss._id, { $set: { imageUrl: imageUrl } });
      console.log(`Updated image for boss: ${boss.name}`);
    }
  } catch (err) {
    console.error('Error updating images:', err);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

updateArenaAndBossImages();