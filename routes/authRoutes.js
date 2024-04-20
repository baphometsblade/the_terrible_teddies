const express = require('express');
const User = require('../models/User');
const Player = require('../models/Player'); // Import Player model to handle player details
const bcrypt = require('bcrypt');
const router = express.Router();
const { body, validationResult } = require('express-validator'); // Import express-validator for input validation

router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', [
  body('username').isLength({ min: 5 }).withMessage('Username must be at least 5 characters long'),
  body('password').isStrongPassword().withMessage('Password must be strong')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('register', { error: errors.array()[0].msg });
  }

  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      console.log('Registration attempt failed: Username already exists');
      res.status(409).render('register', { error: 'Username already exists.' });
      return;
    }
    // User model will automatically hash the password using bcrypt
    const newUser = await User.create({ username, password });
    // Create a new Player profile for the registered user
    const newPlayer = await Player.create({ userId: newUser._id, experiencePoints: 0, level: 1, unlockedTeddies: [], currency: 100 }); // Initialized with default values
    console.log(`New user registered: ${newUser.username}, Player profile created: ${newPlayer._id}`);
    res.redirect('/tutorial');
  } catch (error) {
    console.error('Registration error:', error.message, error.stack);
    res.status(500).render('register', { error: 'An error occurred during registration.' });
  }
});

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('login', { error: errors.array()[0].msg });
  }

  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username });
    if (!user) {
      console.log('Login attempt failed: User not found');
      res.status(400).render('login', { error: 'Username not found. Please register if you don\'t have an account.' });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.user = { userId: user._id, username: user.username }; // Store user details in session
      console.log(`User logged in: ${user.username}`);
      // Ensure a player profile exists for the logged-in user
      let playerProfile = await Player.findOne({ userId: user._id });
      if (!playerProfile) {
        playerProfile = await Player.create({ userId: user._id, experiencePoints: 0, level: 1, unlockedTeddies: [], currency: 100 });
        req.session.firstLogin = true; // Set a flag for first login
      }
      if (req.session.firstLogin) {
        delete req.session.firstLogin; // Remove the flag after redirecting
        res.redirect('/tutorial');
      } else {
        // Redirect to the original URL or dashboard after successful login
        const redirectUrl = req.session.originalUrl || '/dashboard';
        req.session.originalUrl = null;
        res.redirect(redirectUrl);
      }
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

router.get('/logout', (req, res) => {
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

// Add a route for the dashboard
router.get('/dashboard', async (req, res) => {
  // Check if the user is logged in
  if (!req.session.user) {
    console.log('Access denied: User is not logged in');
    res.status(401).redirect('/auth/login');
  } else {
    try {
      // Retrieve player details based on the userId from the session
      const playerDetails = await Player.findOne({ userId: req.session.user.userId }).populate('unlockedTeddies');
      if (!playerDetails) {
        console.log('Player details not found for userId:', req.session.user.userId);
        // Redirect to a setup or information page instead of rendering an error
        res.redirect('/setup'); // Assuming '/setup' is a route that guides users on how to create or update their player profile
        return;
      }
      // Render the dashboard view with player details
      res.render('dashboard', { player: playerDetails });
    } catch (error) {
      console.error('Error retrieving player details:', error.message, error.stack);
      res.status(500).render('error', { error: 'An error occurred while retrieving player details.' });
    }
  }
});

module.exports = router;