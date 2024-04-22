// Load environment variables
require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const authRoutes = require("./routes/authRoutes");
const gameRoutes = require('./routes/gameRoutes'); // Include game routes
const teamRoutes = require('./routes/teamRoutes'); // Include team management routes
const marketRoutes = require('./routes/marketRoutes'); // Include marketplace routes
const challengeRoutes = require('./routes/challengeRoutes'); // Include challenge routes

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
      mongoUrl: process.env.DATABASE_URL
    }),
    cookie: { 
      secure: process.env.NODE_ENV === 'production' && app.get('env') === 'production',
      maxAge: 86400000 // 24 hours
    }
  }),
);

// MongoDB event listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose default connection open');
});

mongoose.connection.on('error', (err) => {
  console.error(`Mongoose default connection error: ${err.message}`);
  console.error(err.stack);
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

// Team Management Routes
app.use('/teams', teamRoutes);

// Marketplace Routes
app.use(marketRoutes);

// Challenge Routes
app.use('/challenges', challengeRoutes);

// Root path response
app.get("/", (req, res) => {
  console.log("Rendering the index page."); // Log the rendering action
  res.render("index", (err, html) => {
    if (err) {
      console.error(`Error rendering index page: ${err.message}`);
      console.error(err.stack);
      res.status(500).send("Error rendering page.");
    } else {
      res.send(html);
    }
  });
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});