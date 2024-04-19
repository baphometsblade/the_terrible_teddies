const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const session = require('express-session');

router.get('/', (req, res) => {
  res.render('login');
});

router.post('/', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      console.log(`User ${username} authenticated successfully.`);
      req.session.save(err => {
        if (err) {
          console.error('Error saving session:', err.message, err.stack);
          res.status(500).render('error', { error: 'Error saving session. Please try again later.' });
        } else {
          console.log(`Session saved successfully for user ${username}.`);
          res.redirect('/dashboard'); // Ensure this matches the expected route in your application
        }
      });
    } else {
      console.log(`Authentication failed for user ${username}.`);
      res.render('login', { error: 'Invalid username or password.' });
    }
  } catch (error) {
    console.error('Error during login:', error.message, error.stack);
    res.status(500).render('error', { error: 'An unexpected error occurred. Please try again later.' });
  }
});

module.exports = router;