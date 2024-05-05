const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../../models/User');
const router = express.Router();

// Login route
router.post('/', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      console.log('User logged in successfully');
      res.redirect('/dashboard');
    } else {
      console.log('Login failed: Invalid username or password');
      // Redirecting to login page with an error query parameter
      res.redirect('/login?error=Invalid username or password');
    }
  } catch (error) {
    console.error('Error logging in:', error.message);
    console.error(error.stack);
    // Redirecting to login page with a generic error message
    res.redirect('/login?error=An error occurred during login');
  }
});

module.exports = router;