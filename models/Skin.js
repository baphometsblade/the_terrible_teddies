const mongoose = require('mongoose');

const skinSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  }
});

const Skin = mongoose.model('Skin', skinSchema);

module.exports = Skin;