require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

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
    const teddiesImagesPath = path.join(__dirname, 'public/images/teddies');
    const placeholderImagePath = path.join(__dirname, 'public/images/placeholder.jpg');
    
    if (!fs.existsSync(teddiesImagesPath)) {
      fs.mkdirSync(teddiesImagesPath, { recursive: true });
      console.log('Created directory for teddy images');
    }

    if (!fs.existsSync(placeholderImagePath)) {
      throw new Error(`Placeholder image does not exist at: ${placeholderImagePath}`);
    }

    teddies.forEach(teddy => {
      const imageName = `${teddy.name.toLowerCase().replace(/\s/g, '-')}.jpg`;
      const imagePath = path.join(teddiesImagesPath, imageName);

      if (!fs.existsSync(imagePath)) {
        fs.copyFileSync(placeholderImagePath, imagePath);
        console.log(`Generated placeholder image for ${teddy.name} at ${imagePath}`);
      } else {
        console.log(`Image for ${teddy.name} already exists`);
      }
    });
  } catch (err) {
    console.error('Error generating teddy images:', err.message, err.stack);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit();
  }
}