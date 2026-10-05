const mongoose = require('mongoose');

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
  if (req.accepts(['html', 'json']) === 'json' || req.path.startsWith('/api')) {
    return res.status(503).json({ error: 'database_unavailable', detail: message });
  }

  return res.status(503).send(message);
}

module.exports = requireDatabase;
