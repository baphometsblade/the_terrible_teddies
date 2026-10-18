/**
 * Whether the caller wants JSON rather than a page.
 *
 * A browser following a link sends an Accept header that prefers HTML, an API
 * client sends application/json, and fetch() or curl send a bare star, which
 * reads as HTML. So anything under /api counts as an API call whatever it sends.
 *
 * This reads originalUrl, not path: middleware mounted with app.use has the
 * mount path stripped from req.path, so a req.path check for /api never matched.
 */
function wantsJson(req) {
  return req.accepts(['html', 'json']) === 'json' || req.originalUrl.startsWith('/api');
}

module.exports = wantsJson;
