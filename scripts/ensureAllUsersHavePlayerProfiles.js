const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Player = require('../models/Player');

dotenv.config();

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

const ensureAllUsersHavePlayerProfiles = async () => {
  try {
    const users = await User.find({});
    for (const user of users) {
      const playerProfileExists = await Player.findOne({ userId: user._id });
      if (!playerProfileExists) {
        await Player.create({
          userId: user._id,
          experiencePoints: 0,
          level: 1,
          unlockedTeddies: [],
          currency: 100
        });
        console.log(`Created player profile for userId: ${user._id}`);
      }
    }
    console.log('Ensured all users have player profiles.');
  } catch (error) {
    console.error('Error ensuring player profiles for all users:', error.message, error.stack);
  } finally {
    mongoose.connection.close();
  }
};

ensureAllUsersHavePlayerProfiles();