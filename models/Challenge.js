const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A challenge must have a title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'A challenge must have a description'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'A challenge must have a type'],
    enum: ['daily', 'weekly'],
    default: 'daily'
  },
  difficulty: {
    type: String,
    required: [true, 'A challenge must have a difficulty level'],
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  reward: {
    type: Number,
    required: [true, 'A challenge must have a reward'],
    min: [1, 'Reward must be at least 1']
  },
  isActive: {
    type: Boolean,
    required: [true, 'A challenge must have an active status'],
    default: true
  }
}, {
  timestamps: true
});

challengeSchema.pre('save', function(next) {
  console.log(`Saving challenge: ${this.title}`);
  next();
});

challengeSchema.post('save', function(doc, next) {
  console.log(`Challenge saved: ${doc.title}`);
  next();
});

challengeSchema.post('save', function(error, doc, next) {
  if (error) {
    console.error('Error saving challenge:', error.message, error.stack);
    next(error);
  } else {
    next();
  }
});

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;