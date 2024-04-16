const Player = require('../models/Player');

async function combinedAuthMiddleware(req, res, next) {
  if (!req.session || !req.session.userId) {
    console.log('Access denied: User is not logged in');
    return res.status(401).redirect('/auth/login');
  }

  try {
    const userExists = await Player.findOne({ userId: req.session.userId });
    if (!userExists) {
      console.log('User not found, redirecting to login');
      return res.redirect('/auth/login');
    }
    console.log(`User authenticated, proceeding to requested page for userId: ${req.session.userId}`);
    next();
  } catch (error) {
    console.error('Error during authentication:', error.message, error.stack);
    res.status(500).render('error', { error: 'An error occurred during authentication.' });
  }
}

module.exports = combinedAuthMiddleware;