// Writes a one-second placeholder tone to public/assets/sounds/<specialMove>.wav
// for every teddy that does not have one yet.
//
//   node scripts/generateSoundEffects.js
//
// It only reads the database (to get the special move names); the output is
// files. Existing .wav files are left alone, so re-running is safe.
//
// The tone is a full-scale (0 dBFS) sine of roughly 153 Hz. That is loud. Nothing
// loads these files today (see the README), but turn the gain down before
// wiring them into the game.
//
// It used to depend on the `wav` package, which was never declared in
// package.json, so it crashed on a clean install. utils/wavEncoder.js replaces
// it.

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Teddy = require('../models/Teddy');
const { encodeWav } = require('../utils/wavEncoder');

const SAMPLE_RATE = 48000;
const SOUNDS_DIR = path.join(__dirname, '..', 'public', 'assets', 'sounds');

function placeholderTone() {
  const pcm = Buffer.alloc(SAMPLE_RATE * 2); // one second of 16-bit mono
  for (let i = 0; i < pcm.length; i += 2) {
    const amplitude = Math.floor(Math.sin(i / 100) * 32767);
    pcm.writeInt16LE(amplitude, i);
  }
  return encodeWav(pcm, { channels: 1, sampleRate: SAMPLE_RATE, bitDepth: 16 });
}

async function generateSoundEffects() {
  const teddies = await Teddy.find({});
  fs.mkdirSync(SOUNDS_DIR, { recursive: true });

  const tone = placeholderTone();

  for (const teddy of teddies) {
    const soundPath = path.join(SOUNDS_DIR, `${teddy.specialMove}.wav`);

    if (fs.existsSync(soundPath)) {
      console.log(`Sound effect already exists for: ${teddy.specialMove}`);
      continue;
    }

    fs.writeFileSync(soundPath, tone);
    console.log(`Sound effect generated for: ${teddy.specialMove}`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Nothing to do.');
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE_URL);
  console.log('MongoDB connected successfully.');

  try {
    await generateSoundEffects();
    console.log('Sound effects generation completed.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Sound effects generation failed:', err.message);
  process.exitCode = 1;
});
