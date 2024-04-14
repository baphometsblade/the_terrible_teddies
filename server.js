// Load environment variables
require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const authRoutes = require("./routes/authRoutes");
const gameRoutes = require('./routes/gameRoutes'); // Include game routes
const isAuthenticated = require('./routes/authMiddleware'); // Include isAuthenticated middleware
const Player = require('./models/Player'); // Include Player model

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  console.error("Error: config environment variables not set. Please create/edit .env configuration file.");
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Ensure express can parse JSON request bodies

// Setting the templating engine to EJS
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

let server;

// Database connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Database connected successfully");
    // Start the server after successful database connection
    server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error(`Database connection error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });

// Session configuration with connect-mongo
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
      mongoUrl: process.env.DATABASE_URL, // Use DATABASE_URL from .env for MongoDB connection
      collection: 'sessions',
      autoRemove: 'interval',
      autoRemoveInterval: 10 // In minutes. You may adjust this value as needed.
    }),
    cookie: { 
      secure: app.get('env') === 'production', // Set secure to true if in a production environment
      httpOnly: true, // Helps prevent client side JS from accessing the cookie
      maxAge: 1000 * 60 * 60 * 24 // Set cookie max age to 1 day
    }
  }),
);

// Middleware to make userId available in all views
app.use((req, res, next) => {
  res.locals.userId = req.session.userId;
  next();
});

// MongoDB event listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose default connection open');
});

mongoose.connection.on('error', (err) => {
  console.error(`Mongoose default connection error: ${err.message}`, err.stack);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose default connection disconnected');
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(() => {
      console.log('Mongoose default connection disconnected through app termination');
      process.exit(0);
    });
  });
});

// Authentication Routes
app.use(authRoutes);

// Game Interaction Routes
app.use(gameRoutes);

// Dashboard route using isAuthenticated middleware
app.get("/dashboard", isAuthenticated, async (req, res, next) => {
  try {
    const player = await Player.findOne({ userId: req.session.userId }).exec();
    if (!player) {
      console.log('Player not found for userId:', req.session.userId);
      return res.status(404).send("Player not found.");
    }
    const playerDetails = await player.getPlayerDetails();
    res.render("dashboard", { playerDetails });
  } catch (error) {
    console.error('Error fetching player details:', error.message, error.stack);
    next(error);
  }
});

// Root path response
app.get("/", (req, res) => {
  res.render("index");
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  const err = new Error('Page not found.');
  err.status = 404;
  next(err);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`, err.stack);
  res.status(err.status || 500).send(err.message || "An error occurred.");
});