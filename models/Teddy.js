const mongoose = require('mongoose');

const teddySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A teddy must have a name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  attackDamage: {
    type: Number,
    required: [true, 'A teddy must have an attack damage value'],
    min: [0, 'Attack damage cannot be negative']
  },
  health: {
    type: Number,
    required: [true, 'A teddy must have health points'],
    min: [0, 'Health cannot be negative']
  },
  specialMove: {
    type: String,
    trim: true
  },
  rarity: {
    type: String,
    required: [true, 'A teddy must have a rarity'],
    enum: {
      values: ['Common', 'Uncommon', 'Rare', 'Legendary'],
      message: 'Rarity must be either: Common, Uncommon, Rare, or Legendary'
    }
  },
  theme: {
    type: String,
    trim: true
  },
  humorStyle: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    trim: true
  },
  interactionStyle: {
    type: String,
    trim: true
  },
  voiceLine: {
    type: String,
    trim: true
  },
  collectibilityFactor: {
    type: Number,
    min: [0, 'Collectibility factor cannot be negative']
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
teddySchema.index({ name: 1 }, { unique: true });
teddySchema.index({ rarity: 1 });

teddySchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    console.error('Error saving document:', error);
    next(new Error('There was a duplicate key error'));
  } else {
    next(error);
  }
});

const Teddy = mongoose.model('Teddy', teddySchema);

module.exports = Teddy;