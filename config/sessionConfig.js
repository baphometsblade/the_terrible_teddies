const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = (app) => {
    app.use(
        session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({
                mongoUrl: process.env.DATABASE_URL
            }),
            cookie: {
                secure: process.env.NODE_ENV === 'production', // Ensure cookies are secure in production
                maxAge: 86400000 // 24 hours
            }
        })
    );

    console.log("Session middleware configured successfully.");
};