const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(`Error ${err.name}: ${err.message}`);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = { message: 'Resource not found', statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = { message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid token', statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Token expired', statusCode: 401 };
  }

  // Rate limit error
  if (err.name === 'RateLimitError') {
    error = { message: 'Too many requests', statusCode: 429 };
  }

  const response = {
    success: false,
    error: error.message || 'Server Error',
    timestamp: new Date().toISOString(),
    version: req.apiVersion || 'v1'
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err;
  }

  res.status(error.statusCode || 500).json(response);
};

module.exports = errorHandler;