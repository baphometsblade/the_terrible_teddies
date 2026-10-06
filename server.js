require('dotenv').config();

const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const requireDatabase = require('./middleware/requireDatabase');

const port = process.env.PORT || 3000;
const hasDatabase = Boolean(process.env.DATABASE_URL);
const demoMode = process.env.DEMO_MODE === 'true' || !hasDatabase;

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
    console.warn('Using in-memory session store. Set DATABASE_URL for persistent production sessions.');
    return undefined;
  }

  return MongoStore.create({
    mongoUrl: process.env.DATABASE_URL
  });
}

function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

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

  // extended:false keeps req.body values as strings. With extended:true a
  // request like ?username[$ne]= produces an object that can reach Mongo as a
  // query operator.
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static('public'));

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
        // Demo mode has no DATABASE_URL, so sessions live in express-session's
        // MemoryStore, which never evicts and is documented as unsuitable for
        // production. A shorter demo lifetime bounds how long an abandoned
        // battle occupies memory. Configure DATABASE_URL for a real store.
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

  // Throttle credential endpoints. Without this /auth/login is open to
  // unlimited password guessing.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many attempts. Please try again later.'
  });
  app.use('/auth/login', authLimiter);
  app.use('/auth/register', authLimiter);

  app.get('/health', (req, res) => {
    res.json({
      ok: true,
      service: 'terrible-teddies',
      demoMode,
      databaseConfigured: hasDatabase
    });
  });

  app.get('/', (req, res) => {
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

  app.use((err, req, res, next) => {
    console.error(`Unhandled application error: ${err.message}`);
    console.error(err.stack);
    res.status(500).send('There was an error serving your request.');
  });

  return app;
}

async function connectDatabase() {
  if (!hasDatabase || demoMode) {
    console.warn('Skipping MongoDB connection. Demo mode is enabled.');
    return false;
  }

  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Database connected successfully');
  return true;
}

async function bootstrap() {
  const app = createApp();
  await connectDatabase();

  const server = app.listen(port, () => {
    console.log(`Terrible Teddies running at http://localhost:${port}`);
    console.log(`Playable demo: http://localhost:${port}/play`);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      process.exit(0);
    });
  });

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
