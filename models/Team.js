const mongoose = require('mongoose');
const handleMongoError = require('../utils/dbErrorHandler'); // Import the utility function for handling MongoDB errors

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
        const error = new Error(`Player with ID ${memberId} does not exist.`);
        console.error('Error validating team member ID:', memberId, error);
        next(error);
        return;
      }
    } catch (error) {
      console.error(`Error validating team member ID: ${memberId}`, error);
      next(error);
      return;
    }
  }
  next();
});

teamSchema.post('save', handleMongoError); // Use the shared error handling utility

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;