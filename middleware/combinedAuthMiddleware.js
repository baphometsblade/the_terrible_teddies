const { isAuthenticated } = require('../routes/middleware/authMiddleware');

const combinedAuthMiddleware = (req, res, next) => {
  console.log('Executing combined authentication checks');
  isAuthenticated(req, res, () => {
    // Additional combined authentication logic can be implemented here
    console.log('User is authenticated');
    next();
  });
};

module.exports = combinedAuthMiddleware;