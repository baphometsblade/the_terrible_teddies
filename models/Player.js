const mongoose = require('mongoose');
const handleMongoError = require('../utils/dbErrorHandler'); // Import the utility function for handling MongoDB errors

const playerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  completedChallenges: [{
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge'
    },
    completionDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

playerSchema.pre('save', function(next) {
  console.log('Saving player:', this.username);
  next();
});

playerSchema.post('save', handleMongoError); // Use the shared error handling utility

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;