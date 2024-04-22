require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Teddy = require('../models/Teddy');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL).then(() => {
  console.log('MongoDB connected successfully');
  generateAnimations();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

async function generateAnimations() {
  try {
    const teddies = await Teddy.find({});
    
    teddies.forEach(teddy => {
      const animationCSS = `
      @keyframes rock-${teddy.name} {
        0%, 100% { transform: rotate(-3deg); }
        50% { transform: rotate(3deg); }
      }

      .${teddy.name}-animation {
        animation: rock-${teddy.name} 1s infinite;
      }
      `;

      // Ensure the animations directory exists
      const animationsDir = path.join(__dirname, '../public/assets/animations');
      if (!fs.existsSync(animationsDir)){
        fs.mkdirSync(animationsDir, { recursive: true });
      }

      // Write the CSS file
      fs.writeFileSync(path.join(animationsDir, `${teddy.name}.css`), animationCSS);
      console.log(`Animation CSS for ${teddy.name} generated successfully.`);
    });

    console.log('All animations have been generated.');
  } catch (error) {
    console.error('Error generating animations:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
  }
}