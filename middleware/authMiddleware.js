// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    console.log(`User session ID: ${req.session.userId} is authenticated`);
    next();
  } else {
    console.log('User is not authenticated');
    res.status(401).send('User is not authenticated');
  }
};

module.exports = {
  isAuthenticated
};