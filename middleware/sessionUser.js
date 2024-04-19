// Middleware to attach session user details to response locals for access in EJS templates
module.exports = (req, res, next) => {
  if (req.session.user) {
    res.locals.sessionUser = req.session.user;
    console.log('Session user details attached to response locals');
  } else {
    console.log('No session user found');
  }
  next();
};