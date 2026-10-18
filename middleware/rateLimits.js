const net = require('node:net');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const wantsJson = require('../utils/wantsJson');

// How often one visitor may hit the app.
//
// Each limiter is applied on the routes themselves (see routes/), not once in
// server.js. Most routers mount at the root, so a limit set up in server.js is
// invisible to anyone reading, or scanning, a router on its own, and a router
// would lose its limit if it were mounted somewhere else. test/authCoverage
// fails if a route is added without one.
//
// The counts live in this process's memory and start again from zero on a
// restart or a deploy: enough to stop one client hammering the app, not a
// replacement for a gateway in front of a large site.

const MINUTE = 60 * 1000;

// Which visitor a request is counted against.
//
// By default that is req.ip, which behind a proxy is the visitor only if
// `trust proxy` (server.js) names the right number of hops. The number of
// proxies in front of an app is the platform's to change, and a wrong count
// puts every visitor in one bucket. A platform that names the visitor in a
// header of its own (Render sends True-Client-IP, Cloudflare CF-Connecting-IP,
// Fly Fly-Client-IP) is more dependable, so CLIENT_IP_HEADER can name it.
//
// Set it only to a header the platform's edge writes itself. One a visitor
// can send is one a visitor can forge, and with it the limits.
function clientKey(req) {
  const name = process.env.CLIENT_IP_HEADER;
  const value = name ? req.get(name) : undefined;
  const address = typeof value === 'string' ? value.trim() : '';
  const named = net.isIP(address) !== 0;
  if (name) checkHeaderArrives(name, named);
  return ipKeyGenerator(named ? address : req.ip);
}

// A header the platform does not send leaves every visitor counted by the
// proxy's address, which may be one shared address. Nothing breaks until the
// day the app is busy, so say so in the log instead. If the header is named and
// none of the first few requests carried an address in it, the log says so
// once. A single request that does carry it settles the question the other way
// and ends the checking, so an internal probe that lacks it is not an alarm.
// Nothing about any visitor goes in the message.
const CHECK_FIRST = 20;
let missingBeforeFirstSeen = 0;
let headerChecked = false;

function checkHeaderArrives(name, present) {
  if (headerChecked) return;
  if (present) {
    headerChecked = true;
    return;
  }
  missingBeforeFirstSeen += 1;
  if (missingBeforeFirstSeen < CHECK_FIRST) return;
  headerChecked = true;
  const shown = String(name).replace(/[^\w-]/g, '?').slice(0, 60);
  console.warn(
    `CLIENT_IP_HEADER is ${shown}, but none of the first ${CHECK_FIRST} requests carried an address in it. ` +
      'Visitors are being counted by the proxy address instead, and if that is one shared address they all share one allowance. ' +
      'Check the setting against what the platform actually sends.'
  );
}

// A refused request is answered in the shape the caller asked for, the way
// middleware/requireDatabase.js and middleware/errorHandlers.js do.
function refuse(message) {
  return (req, res) => {
    res.status(429);
    if (wantsJson(req)) return res.json({ error: 'rate_limited', message });
    return res.type('text/plain').send(message);
  };
}

// Every route that is not an account form. Five requests a second is far more
// than a person playing makes, and it stops a script from filling the session
// store, or the database, by hammering one route.
const actionLimiter = rateLimit({
  windowMs: MINUTE,
  limit: 300,
  keyGenerator: clientKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: refuse('Too many requests. Please slow down and try again shortly.')
});

// Password guessing. Only failures count: a person who logs in correctly has
// guessed nothing, and a school or an office shares one address.
const loginLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 20,
  skipSuccessfulRequests: true,
  keyGenerator: clientKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: refuse('Too many attempts. Please try again later.')
});

// Making accounts. Everything counts, including attempts that are refused.
const registerLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 20,
  keyGenerator: clientKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: refuse('Too many attempts. Please try again later.')
});

module.exports = { actionLimiter, loginLimiter, registerLimiter, clientKey };
