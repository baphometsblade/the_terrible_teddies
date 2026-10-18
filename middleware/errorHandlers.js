const http = require('node:http');
const wantsJson = require('../utils/wantsJson');

/**
 * The status to answer with when the error is the sender's doing, or null when
 * it is ours.
 *
 * body-parser (malformed JSON, a body that is too large or badly compressed,
 * too many form fields) and Express itself (a bad percent-escape in a path
 * parameter) report a sender's mistake as an error carrying a 4xx status.
 * Anything else - a thrown TypeError, a template that fails to render - has no
 * such status and is a bug here.
 */
function clientErrorStatus(err) {
  const status = Number(err && (err.status || err.statusCode));
  return Number.isInteger(status) && status >= 400 && status < 500 ? status : null;
}

const CLIENT_ERROR_CODES = {
  413: 'payload_too_large',
  415: 'unsupported_media_type'
};

/**
 * Final error handler, registered after every route.
 *
 * It used to answer every error with a 500 and write the stack to the log. Any
 * stranger can send a body that is not JSON, is far too large, claims to be
 * gzip and is not, or carries thousands of form fields, so each of those looked
 * like the server breaking and filled the log with stack traces.
 */
function handleErrors(err, req, res, next) {
  // Part of a response has already gone out, so a different one cannot replace
  // it. Hand over to Express, which closes the connection.
  if (res.headersSent) return next(err);

  const status = clientErrorStatus(err);

  if (status) {
    // One short line. Not err.message: the text JSON.parse produces quotes part
    // of the request body back, and a stranger's bytes do not belong in a log.
    const where = String(req.originalUrl || '').split('?')[0].slice(0, 120);
    console.warn(`Rejected request: ${status} ${req.method} ${where}`);

    const message = http.STATUS_CODES[status] || 'Bad Request';
    res.status(status);
    if (wantsJson(req)) {
      return res.json({ error: CLIENT_ERROR_CODES[status] || 'bad_request', message });
    }
    return res.type('text/plain').send(message);
  }

  console.error(`Unhandled application error: ${err instanceof Error ? err.message : String(err)}`);
  if (err && err.stack) console.error(err.stack);

  const message = 'There was an error serving your request.';
  res.status(500);
  if (wantsJson(req)) return res.json({ error: 'server_error', message });
  return res.send(message);
}

module.exports = {
  handleErrors,
  clientErrorStatus
};
