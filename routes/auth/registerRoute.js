const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../../models/User');

const router = express.Router();

// Register route
router.post('/', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('User already exists');
      return res.status(400).send('User already exists');
    }
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

module.exports = router;