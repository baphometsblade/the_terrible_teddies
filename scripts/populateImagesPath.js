const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Teddy = require('../models/Teddy');

dotenv.config();

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB for updating teddy images paths'))
  .catch(err => console.error('Error connecting to MongoDB:', err.message, err.stack));

const imagesDirectory = path.join(__dirname, '../public/images/teddies');
fs.readdir(imagesDirectory, (err, files) => {
  if (err) {
    console.error('Error reading the images directory:', err.message, err.stack);
    return;
  }
  files.forEach(file => {
    const imageName = file.split('.')[0];
    Teddy.findOneAndUpdate({ name: imageName }, { imagePath: `./images/teddies/${file}` }, { new: true })
      .then(updatedTeddy => {
        if (updatedTeddy) {
          console.log(`Updated imagePath for ${updatedTeddy.name}`);
        } else {
          console.log(`No teddy found with the name ${imageName} to update imagePath`);
        }
      })
      .catch(updateErr => console.error('Error updating teddy imagePath:', updateErr.message, updateErr.stack));
  });
});