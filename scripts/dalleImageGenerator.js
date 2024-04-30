const mongoose = require('mongoose');
const fetch = require('node-fetch'); // Assuming node-fetch is already installed, if not, it should be added to the project dependencies.
const Teddy = require('../models/Teddy');
const logger = require('../config/loggingConfig');

// Ensure the DATABASE_URL is correctly set in your .env file
const dbConnectionUrl = process.env.DATABASE_URL;
if (!dbConnectionUrl) {
  logger.error('DATABASE_URL is not set in the environment variables.');
  process.exit(1); // Exit the script if the DATABASE_URL is not set
}

mongoose.connect(dbConnectionUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('Error connecting to MongoDB:', err.message + ' ' + err.stack));

async function generateAndAssignImages() {
  try {
    const teddies = await Teddy.find();
    for (const teddy of teddies) {
      // Use Unsplash API to fetch images for teddies. Ensure you have set the UNSPLASH_ACCESS_KEY in your .env file.
      const response = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(teddy.name)} teddy bear&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.urls && data.urls.regular) {
        teddy.imageUrl = data.urls.regular;
        await teddy.save();
        logger.info(`Image for ${teddy.name} generated and saved.`);
      } else {
        logger.warn(`No image generated for ${teddy.name}.`);
      }
    }
  } catch (error) {
    logger.error('Error generating or assigning images:', error.message + ' ' + error.stack);
  }
}

generateAndAssignImages().then(() => {
  logger.info('Image generation and assignment process completed.');
  mongoose.disconnect().then(() => logger.info('Disconnected from MongoDB'));
}).catch(err => {
  logger.error('An error occurred during the image generation and assignment process:', err.message + ' ' + err.stack);
  mongoose.disconnect().then(() => logger.info('Disconnected from MongoDB'));
});