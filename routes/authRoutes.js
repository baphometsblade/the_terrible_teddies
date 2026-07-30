const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Player = require('../models/Player');
const bcrypt = require('bcrypt');
const router = express.Router();

const MIN_PASSWORD_LENGTH = 10;

// Accounts need MongoDB. Without this guard, demo mode (no DATABASE_URL) lets
// queries sit in Mongoose's buffer for 10 seconds before failing with an opaque
// 500. Fail fast with something the user can act on instead.
function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res
      .status(503)
      .send('Accounts are unavailable in demo mode. The playable demo is at /play.');
  }
  next();
}

// Body values must be strings. Objects arriving here (e.g. username[$ne]=)
// can reach Mongo as query operators.
function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

router.get('/auth/register', (req, res) => {
  res.render('register');
});

router.post('/auth/register', requireDatabase, async (req, res) => {
  try {
    const username = asString(req.body.username);
    const password = asString(req.body.password);

    if (!username || !password) {
      return res.status(400).send('Username and password are required.');
    }
    if (username.length > 40) {
      return res.status(400).send('Username must be 40 characters or fewer.');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).send(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    const newUser = await User.create({ username, password });

    // Create the game profile alongside the account. Previously a User existed
    // with no matching Player, so every Player lookup after login failed and
    // teams/challenges were unreachable for anyone who had just signed up.
    try {
      await Player.create({ user: newUser._id, username: newUser.username });
    } catch (playerError) {
      // Don't leave a User stranded without a Player.
      await User.deleteOne({ _id: newUser._id });
      throw playerError;
    }

    console.log(`New user registered: ${newUser.username}`);
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error.message);
    if (error.code === 11000) {
      res.status(409).send('Username already exists.');
    } else {
      res.status(500).send('An error occurred during registration.');
    }
  }
});

router.get('/auth/login', (req, res) => {
  res.render('login');
});

router.post('/auth/login', requireDatabase, async (req, res) => {
  // One message for both "no such user" and "wrong password". Distinct
  // messages let an attacker enumerate valid usernames.
  const GENERIC_FAILURE = 'Invalid username or password.';

  try {
    const username = asString(req.body.username);
    const password = asString(req.body.password);

    if (!username || !password) {
      return res.status(400).send(GENERIC_FAILURE);
    }

    const user = await User.findOne({ username });
    if (!user) {
      // Spend comparable time to a real comparison so response timing does not
      // reveal whether the account exists.
      await bcrypt.compare(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin');
      console.log('Login attempt failed: user not found');
      return res.status(401).send(GENERIC_FAILURE);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Login attempt failed: bad password');
      return res.status(401).send(GENERIC_FAILURE);
    }

    // Regenerate the session on privilege change. Without this, a session ID
    // planted before login stays valid after it (session fixation).
    return req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration failed:', err.message);
        return res.status(500).send('An error occurred during login.');
      }

      req.session.userId = user._id;
      // Views read req.session.user; it was never assigned, so users never
      // appeared logged in.
      req.session.user = { id: String(user._id), username: user.username };

      console.log(`User logged in: ${user.username}`);
      return res.redirect('/');
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).send('An error occurred during login.');
  }
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during session destruction:', err.message);
      return res.status(500).send('Error logging out');
    }
    res.clearCookie('tt.sid');
    console.log('User logged out successfully');
    res.redirect('/auth/login');
  });
});

// Kept for backwards compatibility with existing links. Logout via GET is
// CSRF-able, so prefer the POST route above.
router.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('tt.sid');
    res.redirect('/auth/login');
  });
});

module.exports = router;
