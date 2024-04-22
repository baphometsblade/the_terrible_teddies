const mongoose = require('mongoose');

const accessorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  effect: {
    type: String,
    required: true
  }
});

const Accessory = mongoose.model('Accessory', accessorySchema);

module.exports = Accessory;