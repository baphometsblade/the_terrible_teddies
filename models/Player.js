const mongoose = require('mongoose');

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
  }
}, {
  timestamps: true
});

playerSchema.pre('save', function(next) {
  console.log('Saving player:', this.username);
  next();
});

playerSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    console.error('Error saving player:', error);
    next(new Error('There was a duplicate key error'));
  } else {
    next();
  }
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;