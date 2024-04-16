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
      values: ['Common', 'Uncommon', 'Rare', 'Legendary', 'Mythic'],
      message: 'Rarity must be either: Common, Uncommon, Rare, Legendary, or Mythic'
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
  },
  currentHealth: {
    type: Number,
    min: [0, 'Current health cannot be negative']
  },
  experiencePoints: {
    type: Number,
    default: 0,
    min: [0, 'Experience points cannot be negative']
  },
  level: {
    type: Number,
    default: 1,
    min: [1, 'Level cannot be less than 1']
  },
  abilities: [{
    type: String,
    trim: true
  }],
  imagePath: {
    type: String,
    required: [true, 'A teddy must have an image path'],
    trim: true
  },
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
teddySchema.index({ name: 1 }, { unique: true });
teddySchema.index({ rarity: 1 });
// Additional compound index for efficient querying by attackDamage and health
teddySchema.index({ attackDamage: 1, health: 1 });

// Methods for teddy progression
teddySchema.methods.addExperience = function(experience) {
  this.experiencePoints += experience;
  console.log(`Added ${experience} experience points to ${this.name}`);
  // Check if the teddy has enough experience to level up
  if (this.checkLevelUp()) {
    this.applyLevelUp();
  }
};

const levelUpThresholds = {
  1: 100,
  2: 200,
  3: 300,
  // Continue for additional levels
};

teddySchema.methods.checkLevelUp = function() {
  const nextLevelThreshold = levelUpThresholds[this.level] || (this.level * 100);
  return this.experiencePoints >= nextLevelThreshold;
};

teddySchema.methods.applyLevelUp = function() {
  // Ensure that applyLevelUp is only called if the teddy is ready to level up
  if (!this.checkLevelUp()) {
    return;
  }
  const previousLevelThreshold = levelUpThresholds[this.level - 1] || ((this.level - 1) * 100);
  this.level += 1;
  this.experiencePoints -= previousLevelThreshold;
  console.log(`${this.name} has leveled up to level ${this.level}`);
  // TODO: Add logic to handle new abilities or stats increase
};

// Common error handling function for duplicate key errors
function handleDuplicateKeyError(error, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    console.error('Duplicate key error:', error);
    next(new Error('There was a duplicate key error'));
  } else {
    next();
  }
}

// Error handling for duplicate key errors and validation errors
teddySchema.post('save', function(error, doc, next) {
  handleDuplicateKeyError(error, next);
  if (error.name === 'ValidationError') {
    console.error('Validation error while saving document:', error);
    next(new Error('Validation failed: ' + error.message));
  }
});

// Error handling for duplicate key errors on update
teddySchema.post('update', function(error, res, next) {
  handleDuplicateKeyError(error, next);
});

// Error handling for duplicate key errors on findOneAndUpdate
teddySchema.post('findOneAndUpdate', function(error, res, next) {
  handleDuplicateKeyError(error, next);
});

const Teddy = mongoose.model('Teddy', teddySchema);

module.exports = Teddy;