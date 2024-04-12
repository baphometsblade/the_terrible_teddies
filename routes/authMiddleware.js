const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  } else {
    // Redirect unauthenticated users to the login page
    res.redirect('/auth/login');
  }
};

module.exports = isAuthenticated;