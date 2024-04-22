const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../../models/User');
const { ensureAuthenticated } = require('../../middleware/authMiddleware');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        console.log('New user registered:', username);
        res.status(201).send('User registered');
    } catch (error) {
        console.error('Error registering new user:', error.message, error.stack);
        res.status(500).send('Error registering user');
    }
});

// User login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id;
            console.log('User logged in:', username);
            res.send('User logged in');
        } else {
            console.log('Login failed for:', username);
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        console.error('Error during login:', error.message, error.stack);
        res.status(500).send('Login error');
    }
});

// User logout
router.get('/logout', ensureAuthenticated, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err.message, err.stack);
            res.status(500).send('Logout error');
        } else {
            console.log('User logged out');
            res.send('User logged out');
        }
    });
});

module.exports = router;