const mongoose = require('mongoose');
const wantsJson = require('../utils/wantsJson');

/**
 * Reject requests to database-backed routes when there is no live connection.
 *
 * Without this, Mongoose buffers the operation against a dead connection for
 * ten seconds and then rejects, so the route hangs and finally answers 500 with
 * a stack trace. That happens on every request in demo mode (no DATABASE_URL)
 * and any time Mongo is unreachable in production.
 *
 * Two problems with the old behaviour:
 *   - A ten-second hang per request is a cheap way to tie up the server.
 *   - A 500 and a stack trace tell the user nothing they can act on.
 *
 * readyState 1 is 'connected'. 2 is 'connecting', which would still buffer, so
 * it is treated as unavailable rather than made to wait.
 */
function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  const message = 'This feature needs a database. The playable demo is at /play.';

  // Match the caller's expectations rather than always sending HTML.
  if (wantsJson(req)) {
    return res.status(503).json({ error: 'database_unavailable', detail: message });
  }

  // A person who followed a link gets a page with a way back, not one bare line
  // of text. Demo mode is the default deploy, so Login and the collection link
  // landed here for every visitor.
  const demo = Boolean(req.app && req.app.locals && req.app.locals.demoMode);
  const page = demo
    ? {
        heading: 'That part of the game is switched off',
        message:
          'Accounts, collections and the marketplace need the game database, and this copy is running as a demo without one. The battle demo works as normal.'
      }
    : {
        heading: 'The game database is not reachable',
        message: 'Please try again in a few minutes. The battle demo still works.'
      };

  return res.status(503).render('unavailable', page, (err, html) => {
    // If the page itself cannot render, fall back to the plain line.
    if (err) return res.status(503).type('text/plain').send(message);
    return res.status(503).send(html);
  });
}

module.exports = requireDatabase;
