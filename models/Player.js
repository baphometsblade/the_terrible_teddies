const mongoose = require('mongoose');
const { LEVEL_UP_BASE, CURRENCY_REWARD } = require('../constants');

const playerSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  experiencePoints: { 
    type: Number, 
    default: 0 
  },
  level: { 
    type: Number, 
    default: 1 
  },
  unlockedTeddies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teddy'
  }],
  currency: {
    type: Number,
    default: 0
  },
  rewards: [{
    level: Number,
    currency: Number,
    specialMove: String,
    unlockedTeddy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teddy'
    },
    additionalItems: [String]
  }]
});

playerSchema.methods.addExperience = function (points) {
  this.experiencePoints += points;
  const experienceForNextLevel = this.level * LEVEL_UP_BASE;
  if (this.experiencePoints >= experienceForNextLevel) {
    this.level++;
    this.experiencePoints -= experienceForNextLevel;
    this.applyLevelUpRewards();
  }
  console.log(`Added ${points} experience points to player ${this.userId}`);
};

playerSchema.methods.applyLevelUpRewards = function () {
  this.currency += CURRENCY_REWARD;
  console.log(`Applied level up rewards to player ${this.userId}`);
};

playerSchema.methods.getPlayerDetails = async function () {
  try {
    await this.populate('unlockedTeddies');
    await this.populate({
      path: 'rewards.unlockedTeddy',
      model: 'Teddy'
    });
    const challenges = this.rewards.filter(reward => reward.level <= this.level);
    return {
      teddies: this.unlockedTeddies,
      level: this.level,
      challenges: challenges
    };
  } catch (error) {
    console.error('Error getting player details:', error.message, error.stack);
    throw error;
  }
};

playerSchema.pre('save', async function (next) {
  try {
    console.log(`Saving player ${this.userId}`);
    next();
  } catch (error) {
    console.error('Error saving player:', error.message, error.stack);
    next(error);
  }
});

// Ensure that a Player document is created for each new User
playerSchema.statics.ensurePlayerProfile = async function(userId) {
  try {
    let player = await this.findOne({ userId: userId });
    if (!player) {
      player = await this.create({ userId: userId, experiencePoints: 0, level: 1, unlockedTeddies: [], currency: 100 });
      console.log(`Created new player profile for userId: ${userId}`);
    }
    return player;
  } catch (error) {
    console.error('Error ensuring player profile:', error.message, error.stack);
    throw error;
  }
};

// Ensure all users have a player profile
playerSchema.statics.createMissingPlayerProfiles = async function() {
  const User = mongoose.model('User');
  try {
    const users = await User.find({});
    for (const user of users) {
      await this.ensurePlayerProfile(user._id);
    }
    console.log('Ensured all users have player profiles.');
  } catch (error) {
    console.error('Error creating missing player profiles:', error.message, error.stack);
  }
};

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;