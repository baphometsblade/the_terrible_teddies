const express = require('express');
const router = express.Router();

// Route for the tutorial page
router.get('/', (req, res) => {
  res.render('tutorial', (err, html) => {
    if (err) {
      console.error('Error rendering tutorial page:', err.message, err.stack);
      res.status(500).send('Error loading the tutorial page.');
    } else {
      res.send(html);
    }
  });
});

module.exports = router;