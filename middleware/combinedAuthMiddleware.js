// This middleware combines authentication checks and additional authorization if needed
const authMiddleware = require('./authMiddleware');

const combinedAuthMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    // Additional authorization logic can be implemented here
    // For now, it simply logs the user's session ID and passes control to the next middleware
    console.log(`User session ID: ${req.sessionID}`);
    next();
  });
};

module.exports = combinedAuthMiddleware;