// Load environment variables
require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const path = require('path'); // Added to set the views directory

const authRoutes = require("./routes/authRoutes");

const gameRoutes = require('./routes/gameRoutes');
const teamRoutes = require('./routes/teamRoutes');
const marketRoutes = require('./routes/marketRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const apiGameRoutes = require('./routes/api/gameRoutes');
const eventRoutes = require('./routes/api/eventRoutes');
const Teddy = require('./models/Teddy');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views')); // Explicitly setting the views directory

app.use(express.static("public"));

let server;

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Database connected successfully");
    server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error(`Database connection error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });

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
      maxAge: 86400000
    }
  }),
);

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

app.get('/', (req, res) => {
  console.log("Rendering the home page.");
  res.render('index', { user: req.session.user });
});

app.use('/auth', authRoutes);

app.use(gameRoutes);

app.use('/teams', teamRoutes);

app.use(marketRoutes);

app.use('/challenges', challengeRoutes);

app.use('/api/game', apiGameRoutes);

app.use('/api', eventRoutes);

app.get('/home', (req, res) => {
  console.log("Redirecting to the home page.");
  res.redirect('/');
});

app.use((req, res, next) => {
  console.log(`Requested route not found: ${req.originalUrl}`);
  res.status(404).render('404', (err, html) => {
    if (err) {
      console.error(`Error rendering 404 page: ${err.message}`);
      console.error(err.stack);
      res.status(500).send("Error rendering 404 page.");
    } else {
      res.send(html);
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});