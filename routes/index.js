const express = require('express');
const authRoutes = require('./authRoutes');
const gameRoutes = require('./gameRoutes');
const teamRoutes = require('./teamRoutes');
const marketRoutes = require('./marketRoutes');
const challengeRoutes = require('./challengeRoutes');

const router = express.Router();

// Log the initialization of the main router
console.log('Initializing main router with all sub-routes.');

router.use(authRoutes);
router.use(gameRoutes);
router.use('/teams', teamRoutes);
router.use(marketRoutes);
router.use('/challenges', challengeRoutes);

router.get('/', (req, res) => {
  console.log('Rendering the index page.');
  res.render('index', (err, html) => {
    if (err) {
      console.error(`Error rendering index page: ${err.message}`);
      console.error(err.stack);
      res.status(500).send("Error rendering page.");
    } else {
      res.send(html);
    }
  });
});

// Handle 404 errors for undefined routes
router.use((req, res, next) => {
  console.log('Requested route not found, sending 404 response.');
  res.status(404).send("Page not found.");
});

// Central error handling
router.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

module.exports = router;