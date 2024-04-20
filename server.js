const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const Player = require('./models/Player');
const itemRoutes = require('./routes/itemRoutes');
const User = require('./models/User');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./utils/logger');
const feedbackRoutes = require('./routes/feedbackRoutes'); // Import feedback routes
const tutorialRoutes = require('./routes/tutorialRoutes'); // Import tutorial routes

// Load environment variables from .env file
dotenv.config();

// Import route handlers
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const teddiesRoutes = require('./routes/teddiesRoutes'); // Importing the teddies routes
const loginRoutes = require('./routes/loginRoutes'); // Importing the login routes

// Initialize Express app
const app = express();

// Trust the first proxy in front of the app to ensure rate limiting works correctly in all environments
app.set('trust proxy', 1);

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => {
    logger.error('Error connecting to MongoDB:', err.message, err.stack);
    process.exit(1);
  });

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Enhance app security with Helmet
app.use(helmet());

// Use compression to improve performance for supported requests
app.use(compression());

// Set up session handling
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
  cookie: { maxAge: 3600000, secure: process.env.NODE_ENV === 'production', httpOnly: true } // Session expires after 1 hour of inactivity, secure flag set based on environment
}));

// Middleware to attach session user to response locals
app.use((req, res, next) => {
  if (req.session.user) {
    res.locals.sessionUser = req.session.user;
  } else {
    res.locals.sessionUser = null;
  }
  next();
});

// Set the view engine to EJS
app.set('view engine', 'ejs');
// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

// Use routes with prefixes
app.use('/auth', authRoutes);
app.use('/login', loginRoutes); // Changed the route prefix for loginRoutes to '/login'
app.use('/game', gameRoutes);
app.use('/teddies', teddiesRoutes);
app.use('/items', itemRoutes);
app.use('/feedback', feedbackRoutes); // Use feedback routes
app.use('/tutorial', tutorialRoutes); // Use tutorial routes

// Redirect root route to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Dashboard route
app.get('/dashboard', async (req, res) => {
  if (!req.session.user) {
    logger.warn('Access denied: User is not logged in');
    res.status(401).redirect('/login');
  } else {
    try {
      const userExists = await User.exists({ _id: req.session.user.userId });
      if (!userExists) {
        logger.warn('User not found');
        return res.status(404).render('error', { message: 'User not found', error: {} });
      }
      let playerDetails = await Player.findOne({ userId: req.session.user.userId }).populate('unlockedTeddies').populate({
        path: 'unlockedTeddies',
        populate: {
          path: 'items',
          model: 'Item'
        }
      });
      if (!playerDetails) {
        logger.info('Player details not found');
        playerDetails = { unlockedTeddies: [], items: [] }; // Corrected property name from 'teddies' to 'unlockedTeddies'
        return res.render('dashboard', { playerDetails: playerDetails });
      }
      logger.info('Rendering dashboard with player details');
      res.render('dashboard', { playerDetails: playerDetails });
    } catch (error) {
      logger.error('Error fetching player details:', error.message, error.stack);
      res.status(500).render('error', { message: 'Failed to load dashboard', error: error });
    }
  }
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', err.message, err.stack);
  res.status(err.status || 500);
  if (err.status === 404) {
    res.render('error', { message: 'Page not found', error: err, stack: err.stack || 'No stack available' });
  } else {
    res.render('error', { message: err.message || 'An unexpected error occurred', error: err, stack: err.stack || 'No stack available' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));