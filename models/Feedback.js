const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  feedbackType: {
    type: String,
    required: true,
    enum: ['GUI', 'Game Logic', 'Tutorials', 'Other']
  },
  experienceRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  feedbackText: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

feedbackSchema.pre('save', function(next) {
  console.log('Saving feedback from user with ID:', this.userId);
  next();
});

feedbackSchema.post('save', function(doc, next) {
  console.log(`Feedback saved successfully with ID: ${doc._id}`);
  next();
});

feedbackSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Duplicate feedback detected'));
  } else {
    next(error);
  }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;