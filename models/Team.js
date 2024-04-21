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
  }]
});

teamSchema.pre('save', async function(next) {
  console.log(`Attempting to save team: ${this.name}`);
  // Check if members array contains valid Player IDs
  for (const memberId of this.members) {
    try {
      const playerExists = await mongoose.model('Player').findById(memberId);
      if (!playerExists) {
        throw new Error(`Player with ID ${memberId} does not exist.`);
      }
    } catch (error) {
      console.error(`Error validating team member ID: ${memberId}`, error);
      next(error);
    }
  }
  next();
});

teamSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    console.error('Error saving team due to duplicate key:', error);
    next(new Error('A team with this name already exists.'));
  } else {
    next();
  }
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;