const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const Player = require('./models/Player'); // Assuming there's a Player model to fetch player details
const itemRoutes = require('./routes/itemRoutes'); // Importing the item routes

// Load environment variables from .env file
dotenv.config();

// Import route handlers
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const teddiesRoutes = require('./routes/teddiesRoutes'); // Importing the teddies routes

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message, err.stack);
    process.exit(1);
  });

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up session handling
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
  cookie: { maxAge: 3600000 } // Session expires after 1 hour of inactivity
}));

// Set the view engine to EJS
app.set('view engine', 'ejs');
// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Use routes with prefixes
app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/teddies', teddiesRoutes); // Using the teddies routes
app.use('/items', itemRoutes); // Using the item routes

// Redirect root route to game home
app.get('/', (req, res) => {
  res.redirect('/game');
});

// Dashboard route
app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    console.log('Access denied: User is not logged in');
    res.status(401).redirect('/auth/login');
  } else {
    try {
      const playerDetails = await Player.findOne({ userId: req.session.userId }).populate('unlockedTeddies').populate({
        path: 'unlockedTeddies',
        populate: {
          path: 'items',
          model: 'Item'
        }
      });
      if (!playerDetails) {
        console.log('Player details not found');
        res.status(404).render('error', { message: 'Player details not found', error: {} });
        return;
      }
      console.log('Rendering dashboard with player details');
      res.render('dashboard', { playerDetails: playerDetails });
    } catch (error) {
      console.error('Error fetching player details:', error.message, error.stack);
      res.status(500).render('error', { message: 'Failed to load dashboard', error: error });
    }
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message, err.stack);
  res.status(err.status || 500);
  if (err.status === 404) {
    res.render('error', { message: 'Page not found', error: err });
  } else {
    res.render('error', { message: err.message, error: err });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));