require('dotenv').config();

const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
        maxAge: 86400000
      }
    })
  );

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

  mount(app, loadRoute('./routes/demoRoutes', 'playable demo routes'));
  mount(app, loadRoute('./routes/authRoutes', 'authentication routes'));
  mount(app, loadRoute('./routes/gameRoutes', 'game routes'));
  mount(app, '/teams', loadRoute('./routes/teamRoutes', 'team routes'));
  mount(app, loadRoute('./routes/marketRoutes', 'marketplace routes'));
  mount(app, '/challenges', loadRoute('./routes/challengeRoutes', 'challenge routes'));
  mount(app, '/api/game', loadRoute('./routes/api/gameRoutes', 'API game routes'));
  mount(app, '/api', loadRoute('./routes/api/eventRoutes', 'API event routes'));

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
