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
      res.status(400).render('login', { error: 'User not found' });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.userId = user._id;
      // Save the session before redirecting to ensure the session is established
      req.session.save(err => {
        if (err) {
          console.error('Error saving session:', err.message, err.stack);
          res.status(500).render('login', { error: 'Error saving session' });
          return;
        }
        console.log(`User logged in: ${user.username}`);
        // Redirect to the original URL or dashboard after successful login
        if (req.session.originalUrl) {
          res.redirect(req.session.originalUrl);
          req.session.originalUrl = null;
        } else {
          res.redirect('/dashboard');
        }
      });
    } else {
      console.log('Login attempt failed: Password is incorrect');
      res.status(400).render('login', { error: 'Password is incorrect' });
      return;
    }
  } catch (error) {
    console.error('Login error:', error.message, error.stack);
    res.status(500).render('login', { error: 'An error occurred during login.' });
    return;
  }
});

router.get('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error during session destruction:', err.message, err.stack);
      res.status(500).send('Error logging out');
    } else {
      console.log('User logged out successfully');
      res.redirect('/auth/login'); // Redirect to the login page after successful logout
    }
  });
});

module.exports = router;