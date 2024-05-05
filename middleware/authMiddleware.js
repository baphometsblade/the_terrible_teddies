// Middleware to check if the user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    console.log(`User session ID: ${req.session.userId} is authenticated`);
    next();
  } else {
    console.log('User is not authenticated');
    res.status(401).send('User is not authenticated');
  }
};

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.isAdmin) {
    console.log(`Admin access granted for user ID: ${req.session.user.userId}`);
    next(); // Proceed if user is admin
  } else {
    console.error("Access denied. Admins only.");
    res.status(403).send("Access denied. Admins only.");
  }
};

module.exports = {
  ensureAuthenticated,
  isAdmin
};