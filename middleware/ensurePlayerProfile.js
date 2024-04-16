const Player = require('../models/Player');
const { getSessionUser } = require('../utils/sessionUtils'); // Import getSessionUser from sessionUtils

async function ensurePlayerProfile(req, res, next) {
  const sessionUser = getSessionUser(req.session);
  if (!sessionUser || !sessionUser.userId) {
    console.log('Access denied: User is not logged in');
    return res.status(401).redirect('/auth/login');
  }

  try {
    const playerProfileExists = await Player.findOne({ userId: sessionUser.userId });
    if (!playerProfileExists) {
      console.log('Player profile not found, redirecting to profile setup');
      return res.redirect('/setup-profile'); // Assuming '/setup-profile' is the correct path to the profile setup page
    }
    console.log('Player profile found, proceeding to requested page');
    next();
  } catch (error) {
    console.error('Error checking player profile:', error.message, error.stack);
    res.status(500).render('error', { error: 'An error occurred while checking player profile.' });
  }
}

module.exports = ensurePlayerProfile;