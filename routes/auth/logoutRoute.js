const express = require('express');
const router = express.Router();

// Logout route
router.get('/', (req, res) => {
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