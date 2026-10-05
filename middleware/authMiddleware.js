// Session-based authentication guard.
//
// There used to be two copies of isAuthenticated (this file and
// routes/middleware/authMiddleware.js) plus an `ensureAuthenticated` alias for a
// set of stale duplicate routers. One copy now, so there is one place to audit -
// and test/authCoverage.test.js asserts every non-public route refuses an
// anonymous caller.
//
// It no longer logs on every authenticated request: that line printed the user
// id on each call, which is a lot of noise for anything that polls.

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).send('User is not authenticated');
};

module.exports = {
  isAuthenticated
};