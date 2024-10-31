const { exec } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');
const Teddy = require('../models/Teddy');
require('dotenv').config(); // Load environment variables

mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('MongoDB connected successfully');
    generateTeddyImages();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
  });

async function generateTeddyImages() {
  try {
    const teddies = await Teddy.find({});
    const imagesPath = path.join(__dirname, '../public/assets/images');

    teddies.forEach(teddy => {
      const sanitizedTeddyName = teddy.name.replace(/[^a-zA-Z0-9 ]/g, ""); // Sanitize teddy name to remove special characters
      const scriptPath = path.join(__dirname, 'generateAiImages.py');
      const command = `python "${scriptPath}" "${sanitizedTeddyName}" "${imagesPath}"`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error generating image for ${sanitizedTeddyName}:`, error.message, error.stack);
          return;
        }
        if (stderr) {
          console.error(`Error in script for ${sanitizedTeddyName}:`, stderr);
          return;
        }
        console.log(`Image generated for: ${sanitizedTeddyName}, Output: ${stdout}`);
      });
    });
  } catch (err) {
    console.error('Error generating teddy images:', err.message, err.stack);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

function createImagesForTeddies() {
  console.log('Creating images for teddies...');
  generateTeddyImages();
}

createImagesForTeddies();
