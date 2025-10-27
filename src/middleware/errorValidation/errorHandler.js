class AppError extends Error {
  constructor(message, statusCode, errorType = 'OPERATIONAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Custom error types
const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
};

// Utility function to create standardized errors
const createError = (message, statusCode, errorType = ERROR_TYPES.OPERATIONAL_ERROR) => {
  return new AppError(message, statusCode, errorType);
};

module.exports = {
  AppError,
  ERROR_TYPES,
  createError
};