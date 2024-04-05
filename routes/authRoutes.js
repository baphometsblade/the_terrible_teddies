const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const router = express.Router();

router.get('/auth/register', (req, res) => {
  res.render('register');
});

router.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    // User model will automatically hash the password using bcrypt
    const newUser = await User.create({ username, password });
    console.log(`New user registered: ${newUser.username}`);
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error.message, error.stack);
    if (error.code === 11000) {
      // Duplicate key error code
      res.status(409).send('Username already exists.');
    } else {
      res.status(500).send('An error occurred during registration.');
    }
  }
});

router.get('/auth/login', (req, res) => {
  res.render('login');
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      console.log('Login attempt failed: User not found');
      return res.status(400).send('User not found');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.userId = user._id;
      console.log(`User logged in: ${user.username}`);
      return res.redirect('/');
    } else {
      console.log('Login attempt failed: Password is incorrect');
      return res.status(400).send('Password is incorrect');
    }
  } catch (error) {
    console.error('Login error:', error.message, error.stack);
    return res.status(500).send('An error occurred during login.');
  }
});

router.get('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error during session destruction:', err.message, err.stack);
      return res.status(500).send('Error logging out');
    }
    console.log('User logged out successfully');
    res.redirect('/auth/login');
  });
});

module.exports = router;