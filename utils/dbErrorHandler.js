// Utility function to handle MongoDB duplicate key errors
function handleMongoError(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    console.error('MongoDB duplicate key error:', error);
    console.error('Error stack:', error.stack);
    next(new Error('Duplicate key error'));
  } else {
    next(error);
  }
}

module.exports = handleMongoError;