const wantsJson = require('../utils/wantsJson');

// Browsers say where a request came from, in Sec-Fetch-Site: same-origin for this
// site's own pages, none for an address the person typed or bookmarked,
// same-site or cross-site for a page somewhere else.
//
// The session cookie is SameSite=Lax, so a browser already will not send it with
// another site's form post. This is the second layer, and the reason the forms
// carry no CSRF tokens: a request that changes something, and that a page on
// another site caused, is refused outright.
//
// It fails open. A request with no Sec-Fetch-Site is a command-line client, a
// test, or a browser too old to send the header. None of those is a page
// borrowing a visitor's cookie, and refusing them would break more than it
// protects.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ANOTHER_SITE = new Set(['cross-site', 'same-site']);

function refuseWhen(applies) {
  return function refuseCrossSite(req, res, next) {
    const site = String(req.get('sec-fetch-site') || '').trim().toLowerCase();
    if (!ANOTHER_SITE.has(site) || !applies(req)) return next();

    // Only the method, the path and one of two known words reach the log.
    const where = String(req.originalUrl || '').split('?')[0].slice(0, 120);
    console.warn(`Refused ${site} ${req.method} ${where}`);

    const message = 'This request came from another site.';
    res.status(403);
    if (wantsJson(req)) return res.json({ error: 'cross_site_request', message });
    return res.type('text/plain').send(message);
  };
}

module.exports = {
  // Everything that changes something. Applied to the whole app in server.js.
  refuseCrossSiteWrites: refuseWhen((req) => !SAFE_METHODS.has(req.method)),
  // For the rare GET that changes something as well (logout, in routes/authRoutes.js).
  refuseCrossSite: refuseWhen(() => true)
};
