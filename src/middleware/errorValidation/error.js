const { AppError } = require('./errorHandler');

exports.notFound = (req, res) => {
  res.status(404).json({ 
    success: false,
    error: {
      message: 'Route not found',
      type: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    }
  });
};

exports.errorHandler = (err, req, res, next) => {
  console.error('Error Stack:', err.stack);
  console.error('Error Details:', {
    message: err.message,
    name: err.name,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  let error = { ...err };
  error.message = err.message;

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message
    }));
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: errors,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: `${error.path} already exists`
    }));
    return res.status(400).json({
      success: false,
      error: {
        message: 'Duplicate entry',
        type: 'DUPLICATE_ERROR',
        details: errors,
        timestamp: new Date().toISOString()
      }
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        type: 'AUTH_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expired',
        type: 'AUTH_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Custom AppError
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        type: err.errorType || 'OPERATIONAL_ERROR',
        timestamp: err.timestamp || new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    });
  }

  // Default error
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      type: 'SERVER_ERROR',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};