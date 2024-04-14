const mongoose = require('mongoose');
const Analytics = mongoose.model('Analytics');

// Middleware function to track analytics data
async function analyticsMiddleware(req, res, next) {
  try {
    const startTime = process.hrtime();

    res.on('finish', async () => {
      const endTime = process.hrtime(startTime);
      const elapsedTime = endTime[0] * 1000 + endTime[1] / 1000000; // Convert to milliseconds

      const analyticsData = {
        path: req.path,
        method: req.method,
        status: res.statusCode,
        duration: elapsedTime,
        timestamp: new Date(),
      };

      // Save the analytics data to the database
      const analytics = new Analytics(analyticsData);
      await analytics.save();

      console.log(`Analytics data saved for ${req.method} ${req.path}`);
    });

    next();
  } catch (error) {
    console.error('Error in analyticsMiddleware:', error.message, error.stack);
    next(error);
  }
}

module.exports = analyticsMiddleware;