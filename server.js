require('dotenv').config();

const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const teamRoutes = require('./routes/teamRoutes');
const marketRoutes = require('./routes/marketRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const apiGameRoutes = require('./routes/api/gameRoutes');
const eventRoutes = require('./routes/api/eventRoutes');
const demoRoutes = require('./routes/demoRoutes');

const port = process.env.PORT || 3000;
const hasDatabase = Boolean(process.env.DATABASE_URL);
const demoMode = process.env.DEMO_MODE === 'true' || !hasDatabase;

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

  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static('public'));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'terrible-teddies-local-dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      store: createSessionStore(),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production' && process.env.FORCE_SECURE_COOKIES === 'true',
        maxAge: 86400000
      }
    })
  );

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

  app.use(demoRoutes);
  app.use(authRoutes);
  app.use(gameRoutes);
  app.use('/teams', teamRoutes);
  app.use(marketRoutes);
  app.use('/challenges', challengeRoutes);
  app.use('/api/game', apiGameRoutes);
  app.use('/api', eventRoutes);

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
