const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  created_at: {
    type: Date,
    default: Date.now
  }
});

teamSchema.pre('save', function(next) {
  console.log(`Saving team: ${this.name}`);
  next();
});

teamSchema.post('save', function(doc, next) {
  console.log(`Team saved: ${doc.name}`);
  next();
});

teamSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    console.error('Error saving team due to duplicate name:', error.message);
    next(new Error('A team with this name already exists.'));
  } else if (error) {
    console.error('Error saving team:', error.message, error.stack);
    next(error);
  } else {
    next();
  }
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;