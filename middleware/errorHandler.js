const express = require('express');
const logger = require('../utils/logger'); // Assuming a logger utility exists for logging

const errorHandler = (err, req, res, next) => {
  logger.error(`Error occurred: ${err.message}. Stack: ${err.stack}`);
  
  // Determine if the error is a MongoDB validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation error occurred',
      details: messages
    });
  }

  // Check for duplicate key error (code 11000 from MongoDB)
  if (err.code && err.code === 11000) {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate key error',
      details: err.message
    });
  }

  // Handle incorrect MongoDB ObjectId errors
  if (err.kind === 'ObjectId') {
    return res.status(404).json({
      status: 'error',
      message: 'Resource not found',
      details: 'Invalid identifier'
    });
  }

  // For unhandled errors, log them and respond with a generic message
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: 'An unexpected error occurred',
    details: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;