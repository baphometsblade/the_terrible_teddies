const mongoose = require('mongoose');

// Function to connect to the MongoDB database
function connectDB() {
    mongoose.connect(process.env.DATABASE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log('Database connected successfully');
    }).catch((err) => {
        console.error('Database connection error:', err.message);
        console.error(err.stack);
    });

    // MongoDB event listeners
    mongoose.connection.on('connected', () => {
        console.log('Mongoose default connection open');
    });

    mongoose.connection.on('error', (err) => {
        console.error('Mongoose default connection error:', err.message);
        console.error(err.stack);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('Mongoose default connection disconnected');
    });

    process.on('SIGINT', () => {
        console.log('SIGINT signal received: closing MongoDB connection');
        mongoose.connection.close(() => {
            console.log('Mongoose default connection disconnected through app termination');
            process.exit(0);
        });
    });
}

module.exports = { connectDB };