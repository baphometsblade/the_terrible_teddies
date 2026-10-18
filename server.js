require('dotenv').config();

const dns = require('node:dns').promises;
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const requireDatabase = require('./middleware/requireDatabase');
const { actionLimiter } = require('./middleware/rateLimits');
const { refuseCrossSiteWrites } = require('./middleware/refuseCrossSite');
const { handleErrors } = require('./middleware/errorHandlers');
const BoundedSessionStore = require('./utils/boundedSessionStore');

const port = process.env.PORT || 3000;
const hasDatabase = Boolean(process.env.DATABASE_URL);
const demoMode = process.env.DEMO_MODE === 'true' || !hasDatabase;

// How long to wait for MongoDB before giving up. See connectDatabase().
const dbTimeoutMs = Number(process.env.DB_TIMEOUT_MS) || 10000;

// How long a shutdown waits for open connections before giving up. See
// installShutdown(). Render kills the process 30 seconds after SIGTERM, so the
// default stays well inside that. Anything unset or unusable gets the default
// rather than 0: a zero or negative wait would cut every connection off at once,
// and setTimeout reads a delay above 2^31-1 as 1.
function positiveMs(value, fallback) {
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? Math.min(ms, 2 ** 31 - 1) : fallback;
}
const shutdownGraceMs = positiveMs(process.env.SHUTDOWN_GRACE_MS, 10000);

/**
 * Hostname of a connection string, with any credentials stripped.
 *
 * DATABASE_URL carries user:password@ inline, so it must never be interpolated
 * into a log line or an error message verbatim.
 */
function safeHost(uri) {
  try {
    return new URL(uri).hostname;
  } catch {
    return '<unparsable DATABASE_URL>';
  }
}

/**
 * Resolve a mongodb+srv:// cluster's SRV record before handing the URI to the
 * driver.
 *
 * serverSelectionTimeoutMS does not cover this step. SRV resolution happens in
 * the DNS layer first, with its own OS-level retry behaviour, and when the
 * cluster no longer exists the lookup rejects *outside* the driver's promise
 * chain - so it escapes any try/catch around mongoose.connect() and takes the
 * process down with a raw node:internal/dns stack trace. Doing the lookup here
 * keeps the failure somewhere we can describe it.
 */
async function assertSrvResolves(uri, timeoutMs) {
  if (!uri.startsWith('mongodb+srv://')) return;
  const host = safeHost(uri);

  const lookup = dns.resolveSrv(`_mongodb._tcp.${host}`);
  // If the timeout below wins the race, this lookup still settles afterwards.
  // Without a handler attached, that late rejection is an unhandled rejection.
  lookup.catch(() => {});

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`lookup exceeded ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    await Promise.race([lookup, timeout]);
  } catch (error) {
    throw new Error(`DNS lookup for ${host} failed (${error.message})`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Load an optional route module.
 *
 * Previously this returned a fallback router whose handler was router.use(...) -
 * a catch-all. Because most routers are mounted at the root path, a single
 * failing module silently swallowed every route registered after it, including
 * the 404 handler. One bad require turned the whole app into a 503.
 *
 * Now a failed module is skipped entirely: its routes 404, everything else
 * keeps working, and the failure is logged loudly.
 */
function loadRoute(modulePath, label) {
  try {
    return require(modulePath);
  } catch (error) {
    console.error(`[startup] FAILED to load ${label} (${modulePath}): ${error.message}`);
    console.error('[startup] Those routes will return 404. Other routes are unaffected.');
    return null;
  }
}

function mount(app, pathOrRouter, maybeRouter) {
  const hasPath = typeof pathOrRouter === 'string';
  const router = hasPath ? maybeRouter : pathOrRouter;
  if (!router) return;
  if (hasPath) app.use(pathOrRouter, router);
  else app.use(router);
}

/**
 * Mount a router that cannot work without MongoDB.
 *
 * The guard makes the route answer 503 immediately instead of letting Mongoose
 * buffer against a dead connection for ten seconds and then throw a 500 with a
 * stack trace - which is what every DB-backed route did in demo mode.
 *
 * The guard is registered only for the paths the router actually declares, NOT
 * as `app.use(requireDatabase, router)`. Most of these routers mount at the
 * root, so a bare app.use would run the guard for every request and swallow
 * the 404 handler - the same shadowing bug that loadRoute's old catch-all
 * fallback caused.
 */
function mountDbRoute(app, pathOrRouter, maybeRouter) {
  const hasPath = typeof pathOrRouter === 'string';
  const router = hasPath ? maybeRouter : pathOrRouter;
  if (!router) return;

  const declaredPaths = [
    ...new Set(
      router.stack
        .filter((layer) => layer.route && layer.route.path)
        .map((layer) => layer.route.path)
    )
  ];

  if (declaredPaths.length) {
    const prefix = hasPath ? pathOrRouter : '';
    const guarded = declaredPaths.map((p) => `${prefix}${p}`.replace(/\/{2,}/g, '/'));
    app.use(guarded, requireDatabase);
  }

  if (hasPath) app.use(pathOrRouter, router);
  else app.use(router);
}

function createSessionStore() {
  if (!hasDatabase || demoMode) {
    // express-session's default MemoryStore never evicts, so a visitor who
    // starts a battle and leaves would cost memory until the process restarted,
    // with no ceiling. This store is capped and sweeps expired sessions. See
    // utils/boundedSessionStore.js.
    const maxSessions = BoundedSessionStore.parseMaxSessions(process.env.DEMO_MAX_SESSIONS);
    console.warn(`Using an in-memory session store, capped at ${maxSessions} sessions. Set DATABASE_URL for persistent sessions.`);
    return new BoundedSessionStore({ maxSessions });
  }

  return MongoStore.create({
    mongoUrl: process.env.DATABASE_URL
  });
}

function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  // What views may show a visitor. Operator notes (which variable to set, which
  // mode the server is in) are for whoever runs the site, so they appear
  // everywhere except production. demoMode lets the navbar and home page leave
  // out links that can only dead-end when there is no database.
  app.locals.demoMode = demoMode;
  app.locals.showOperatorNotes = !isProduction;

  // Anchored to this file, not the working directory. Express resolves a bare
  // 'views' (its default) and a bare 'public' against process.cwd(), so starting
  // the server from anywhere but the repo root - a service manager, or
  // `node /srv/teddies/server.js` - failed every page render and 404'd the
  // stylesheets and the favicon.
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');


  // Render/Heroku/Fly terminate TLS at a proxy. Without this, req.secure is
  // false and secure cookies are never sent.
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:'],
        mediaSrc: ["'self'"]
      }
    }
  }));

  // Before the body is read and before any session is touched: a write that a
  // page on another site caused goes no further. See middleware/refuseCrossSite.js.
  app.use(refuseCrossSiteWrites);

  // extended:false keeps req.body values as strings. With extended:true a
  // request like ?username[$ne]= produces an object that can reach Mongo as a
  // query operator.
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(
    session({
      name: 'tt.sid',
      secret: process.env.SESSION_SECRET || 'terrible-teddies-local-dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      store: createSessionStore(),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        // Secure in production unless explicitly opted out. Previously this
        // required FORCE_SECURE_COOKIES=true as well, so the default production
        // deploy sent session cookies over plain HTTP.
        secure: isProduction && process.env.FORCE_SECURE_COOKIES !== 'false',
        // Demo sessions live in memory (utils/boundedSessionStore.js), so they
        // get a shorter life: an abandoned battle is swept after two hours.
        // Configure DATABASE_URL for a persistent store.
        maxAge: demoMode ? 2 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
      }
    })
  );

  // Views read `currentUser` to decide what to show. Each route used to pass its
  // own `user` - the whole session object in one, session.user in another,
  // nothing at all in a third - so "signed in" meant different things on
  // different pages, and the header never showed Logout.
  app.use((req, res, next) => {
    const sess = req.session;
    res.locals.currentUser =
      sess && sess.userId
        ? { id: String(sess.userId), username: (sess.user && sess.user.username) || null }
        : null;
    next();
  });

  // Rate limits are set on the routes themselves (middleware/rateLimits.js), so
  // a router keeps its limit wherever it is mounted. Password guessing at
  // /auth/login used to be throttled here; it is throttled in routes/authRoutes.js
  // now. test/authCoverage.test.js fails if any route has no limit.

  app.get('/health', (req, res) => {
    res.json({
      ok: true,
      service: 'terrible-teddies',
      demoMode,
      databaseConfigured: hasDatabase
    });
  });

  app.get('/', actionLimiter, (req, res) => {
    res.render('index', { user: req.session.user, demoMode });
  });

  // The demo is the one thing that must work without a database.
  mount(app, loadRoute('./routes/demoRoutes', 'playable demo routes'));

  // Everything below needs MongoDB, so it is guarded to fail fast rather than
  // hang for ten seconds on Mongoose buffering and then 500.
  mountDbRoute(app, loadRoute('./routes/authRoutes', 'authentication routes'));
  mountDbRoute(app, loadRoute('./routes/gameRoutes', 'game routes'));
  mountDbRoute(app, '/teams', loadRoute('./routes/teamRoutes', 'team routes'));
  mountDbRoute(app, loadRoute('./routes/marketRoutes', 'marketplace routes'));
  mountDbRoute(app, '/challenges', loadRoute('./routes/challengeRoutes', 'challenge routes'));
  mountDbRoute(app, '/api', loadRoute('./routes/api/eventRoutes', 'API event routes'));

  app.use((req, res) => {
    console.log(`Requested route not found: ${req.originalUrl}`);
    res.status(404).render('404', (err, html) => {
      if (err) {
        console.error(`Error rendering 404 page: ${err.message}`);
        res.status(404).send('Page not found.');
        return;
      }
      res.send(html);
    });
  });

  // Last, so it sees errors from everything above. A malformed or oversized
  // request body is the sender's mistake and is answered 4xx; anything else is
  // a 500. See middleware/errorHandlers.js.
  app.use(handleErrors);

  return app;
}

async function connectDatabase() {
  if (!hasDatabase || demoMode) {
    console.warn('Skipping MongoDB connection. Demo mode is enabled.');
    return false;
  }

  // Fail fast instead of hanging. bootstrap() awaits this before app.listen(),
  // so an unreachable host stalls the entire boot: no port bound, no output,
  // no exit. The driver's default server-selection window is 30s, and for a
  // mongodb+srv:// host that no longer resolves in DNS it can stall past that
  // indefinitely while retrying the lookup. Cap the wait, and turn the failure
  // into a message that names the host and the way out.
  try {
    await assertSrvResolves(process.env.DATABASE_URL, dbTimeoutMs);
    await mongoose.connect(process.env.DATABASE_URL, {
      serverSelectionTimeoutMS: dbTimeoutMs,
    });
  } catch (error) {
    throw new Error(
      `Could not reach MongoDB at ${safeHost(process.env.DATABASE_URL)} ` +
      `within ${dbTimeoutMs}ms: ${error.message}. Check DATABASE_URL, or set ` +
      'DEMO_MODE=true to start without a database.'
    );
  }

  console.log('Database connected successfully');
  return true;
}

/**
 * Stop cleanly when the platform asks.
 *
 * Render, Docker and systemd stop a process with SIGTERM and kill it outright
 * if it is still there after a delay (30 seconds on Render). With no handler,
 * Node dies on the spot and drops every request that is open. The only handler
 * here used to be for SIGINT, and it could wait forever.
 *
 * The first signal stops accepting connections, lets open requests finish,
 * closes MongoDB and exits 0. Three things keep that from hanging:
 *
 *   - Idle keep-alive connections are closed straight away. Node 18 leaves them
 *     to time out by themselves, and close() waits for every one.
 *   - Whatever is still open after SHUTDOWN_GRACE_MS (default 10 seconds) is
 *     given up on: the process exits 1.
 *   - A second signal exits at once, so Ctrl-C twice always works.
 *
 * test/shutdown.test.js starts the real server and signals it.
 */
function installShutdown(server) {
  let stopping = false;

  const stop = (signal) => {
    if (stopping) {
      console.warn(`${signal} signal received again: exiting now`);
      process.exit(1);
    }
    stopping = true;
    console.log(`${signal} signal received: closing HTTP server`);

    setTimeout(() => {
      console.warn(`Shutdown had not finished after ${shutdownGraceMs}ms: exiting anyway`);
      process.exit(1);
    }, shutdownGraceMs).unref();

    server.close(async () => {
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
        }
      } catch (error) {
        console.error(`Closing MongoDB failed: ${error.message}`);
      }
      process.exit(0);
    });
    server.closeIdleConnections();
  };

  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
}

async function bootstrap() {
  const app = createApp();
  await connectDatabase();

  const server = app.listen(port, () => {
    console.log(`Terrible Teddies running at http://localhost:${port}`);
    console.log(`Playable demo: http://localhost:${port}/play`);
  });

  installShutdown(server);

  return server;
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error(`Startup failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  bootstrap,
  connectDatabase
};
