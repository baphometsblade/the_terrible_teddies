const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback'); // Assuming a Feedback model exists for MongoDB
const ensureAuthenticated = require('../middleware/ensureAuthenticated');

// Route to handle feedback form submission
router.post('/submit', ensureAuthenticated, async (req, res) => {
  try {
    const { feedbackText, feedbackType, experienceRating } = req.body;
    if (!feedbackText || !feedbackType || !experienceRating) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const newFeedback = new Feedback({
      userId: req.user._id, // Assuming req.user is populated by ensureAuthenticated middleware
      feedbackText,
      feedbackType,
      experienceRating
    });
    await newFeedback.save();
    console.log('Feedback submitted successfully:', newFeedback);
    res.status(200).json({ message: 'Feedback submitted successfully.' });
  } catch (error) {
    console.error('Error submitting feedback:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error while submitting feedback.' });
  }
});

module.exports = router;