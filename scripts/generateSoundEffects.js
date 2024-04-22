const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Writable } = require('stream');
const wav = require('wav');
const Teddy = require('../models/Teddy');
require('dotenv').config();

mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected successfully.');
    generateSoundEffects();
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

async function generateSoundEffects() {
    const teddies = await Teddy.find({});
    const soundsDir = path.join(__dirname, '..', 'public', 'assets', 'sounds');

    if (!fs.existsSync(soundsDir)) {
        fs.mkdirSync(soundsDir, { recursive: true });
    }

    const soundGenerationPromises = teddies.map(teddy => {
        const soundPath = path.join(soundsDir, `${teddy.specialMove}.wav`);
        if (!fs.existsSync(soundPath)) {
            return new Promise((resolve, reject) => {
                const fileWriter = new wav.FileWriter(soundPath, {
                    channels: 1,
                    sampleRate: 48000,
                    bitDepth: 16
                });

                const data = Buffer.alloc(48000 * 2); // 1 second of silence
                for (let i = 0; i < data.length; i += 2) {
                    const amplitude = Math.floor(Math.sin(i / 100) * 32767);
                    data.writeInt16LE(amplitude, i);
                }

                const bufferStream = new Writable();
                bufferStream._write = (chunk, encoding, next) => {
                    fileWriter.write(chunk);
                    next();
                };

                bufferStream.on('finish', () => {
                    fileWriter.end();
                    console.log(`Sound effect generated for: ${teddy.specialMove}`);
                    resolve();
                });

                bufferStream.on('error', err => {
                    console.error('Error writing sound effect:', err);
                    reject(err);
                });

                bufferStream.end(data);
            });
        } else {
            console.log(`Sound effect already exists for: ${teddy.specialMove}`);
            return Promise.resolve();
        }
    });

    Promise.all(soundGenerationPromises).then(() => {
        mongoose.disconnect();
        console.log('Sound effects generation completed.');
    }).catch(err => {
        console.error('Error during sound effects generation:', err);
        mongoose.disconnect();
    });
}