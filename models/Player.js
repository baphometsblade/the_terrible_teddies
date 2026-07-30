const mongoose = require('mongoose');
const handleMongoError = require('../utils/dbErrorHandler'); // Import the utility function for handling MongoDB errors

const playerSchema = new mongoose.Schema({
  // The login account this game profile belongs to.
  //
  // User and Player were previously two unrelated collections with no key
  // between them, so authorization had to match on username - fragile, and it
  // broke outright wherever code passed a User id to Player.findById().
  //
  // sparse so historical rows without a link stay valid until backfilled by
  // scripts/linkPlayersToUsers.js.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true,
    index: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    // Optional: registration collects username and password only. Players
    // created at signup have no email until the user supplies one.
    trim: true,
    lowercase: true,
    sparse: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  completedChallenges: [{
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge'
    },
    completionDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

playerSchema.pre('save', function(next) {
  console.log('Saving player:', this.username);
  next();
});

playerSchema.post('save', handleMongoError); // Use the shared error handling utility

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;