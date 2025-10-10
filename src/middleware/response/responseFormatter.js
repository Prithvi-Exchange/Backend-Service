/**
 * Standardized response formatter for all API responses
 * Provides consistent success and error response formats across the entire application
 */

/**
 * Success response formatter
 * @param {Object} res - Express response object
 * @param {any} data - Response data payload
 * @param {string} message - Success message
 * @param {number} code - HTTP status code (default: 200)
 * @param {Object} metadata - Additional metadata (pagination, etc.)
 * @returns {Object} Formatted success response
 */
const successResponse = (res, data = null, message = 'Success', code = 200, metadata = null) => {
  // Base success response structure
  const response = {
    success: true,      // Always true for success responses
    code,              // HTTP status code
    message,           // Human-readable message
    data,              // Actual response data payload
    timestamp: new Date().toISOString()  // ISO timestamp for tracking
  };
  
  // Add metadata if provided (pagination, counts, etc.)
  if (metadata) {
    response.metadata = metadata;
  }
  
  return res.status(code).json(response);
};

/**
 * Error response formatter
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} code - HTTP status code (default: 500)
 * @param {Array} errors - Detailed error array (for validation errors)
 * @param {string} errorCode - Application-specific error code
 * @returns {Object} Formatted error response
 */
const errorResponse = (res, message = 'Internal Server Error', code = 500, errors = null, errorCode = null) => {
  // Base error response structure
  const response = {
    success: false,     // Always false for error responses
    code,              // HTTP status code
    message,           // Human-readable error message
    timestamp: new Date().toISOString()  // ISO timestamp for tracking
  };
  
  // Add error code if provided (for client-side error handling)
  if (errorCode) {
    response.errorCode = errorCode;
  }
  
  // Add detailed errors array if provided (useful for validation errors)
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(code).json(response);
};

module.exports = {
  successResponse,
  errorResponse
};