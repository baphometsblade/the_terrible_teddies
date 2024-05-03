const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    console.log('User registered successfully');
    res.redirect('/login');
  } catch (error) {
    console.error('Error registering user:', error.message);
    console.error(error.stack);
    res.status(500).send('Error registering user');
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      console.log('User logged in successfully');
      res.redirect('/dashboard');
    } else {
      console.log('Login failed: Invalid username or password');
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Error logging in:', error.message);
    console.error(error.stack);
    res.status(500).send('Error logging in');
  }
});

// Logout route
router.get('/logout', ensureAuthenticated, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error logging out:', err.message);
      console.error(err.stack);
      return res.status(500).send('Error logging out');
    }
    console.log('User logged out successfully');
    res.redirect('/login');
  });
});

module.exports = router;