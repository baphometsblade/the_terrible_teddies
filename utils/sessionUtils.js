const Player = require('../models/Player');

// Function to update session with the latest user information
const updateSessionUser = (session, user) => {
  if (!session || !user) {
    console.error('updateSessionUser: Missing session or user data');
    return;
  }
  try {
    session.userId = user._id.toString(); // Ensure userId is stored as a string for consistency
    session.username = user.username; // Store the username in the session for easy access
    console.log(`Session updated for user: ${user.username}`);
  } catch (error) {
    console.error('Error updating session user:', error.message, error.stack);
  }
};

// Function to retrieve user data stored in the session
const getSessionUser = (session) => {
  if (!session || !session.userId) {
    console.error('getSessionUser: Missing session or userId');
    return null;
  }
  try {
    return { userId: session.userId };
  } catch (error) {
    console.error('Error retrieving session user:', error.message, error.stack);
    return null;
  }
};

module.exports = {
  updateSessionUser,
  getSessionUser
};