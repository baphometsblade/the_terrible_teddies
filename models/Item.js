const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  statBoost: {
    type: Map,
    of: Number,
    required: true
  },
  rarity: {
    type: String,
    required: true,
    enum: ['Common', 'Uncommon', 'Rare', 'Legendary', 'Mythic']
  },
  imagePath: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

itemSchema.pre('save', function(next) {
  console.log(`Saving item: ${this.name}`);
  next();
});

itemSchema.post('save', function(doc, next) {
  console.log(`Item ${doc.name} saved successfully`);
  next();
});

itemSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    console.log('Error saving item due to duplicate key', error);
    next(new Error('There was a duplicate key error'));
  } else if (error) {
    console.error('Error saving item:', error);
    next(error);
  } else {
    next();
  }
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;