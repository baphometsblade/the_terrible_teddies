const express = require('express');
const router = express.Router();

// Modular route handlers
const registerRoute = require('./auth/registerRoute');
const loginRoute = require('./auth/loginRoute');
const logoutRoute = require('./auth/logoutRoute');

// Mount modular route handlers
router.use('/register', registerRoute);
router.use('/login', loginRoute);
router.use('/logout', logoutRoute);

module.exports = router;