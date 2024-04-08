const mongoose = require('mongoose');

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
  // Additional fields for player rewards can be added here
  unlockedTeddies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teddy'
  }],
  currency: {
    type: Number,
    default: 0
  }
});

playerSchema.methods.addExperience = function(experience) {
  this.experiencePoints += experience;
  const experienceForNextLevel = this.level * 20; // Example formula for XP needed to level up
  if (this.experiencePoints >= experienceForNextLevel) {
    this.levelUp();
  }
};

playerSchema.methods.levelUp = function() {
  this.level++;
  const experienceForNextLevel = this.level * 20;
  this.experiencePoints -= experienceForNextLevel;
  // Logic for rewards upon leveling up
  this.currency += 100; // Award in-game currency as a reward
  // Additional rewards logic can be implemented here
  console.log(`Player ${this.userId} leveled up to level ${this.level} and received 100 currency.`);
};

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;