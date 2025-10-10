/**
 * Pagination utility for handling pagination parameters across all GET APIs
 * Standardizes pageNumber and pageSize extraction and pagination metadata creation
 */

/**
 * Extract and validate pagination parameters from request query
 * @param {Object} req - Express request object
 * @returns {Object} Pagination parameters { page, limit, offset }
 */
const getPaginationParams = (req) => {
  // Extract pageNumber from query, default to 1 if not provided or invalid
  const page = Math.max(1, parseInt(req.query.pageNumber) || 1);
  
  // Extract pageSize from query, default to 10 if not provided or invalid
  // Cap pageSize at 100 to prevent excessive data retrieval
  const limit = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10));
  
  // Calculate database offset for SQL queries
  const offset = (page - 1) * limit;
  
  return {
    page,      // Current page number (1-based)
    limit,     // Number of items per page
    offset     // Database offset for SQL queries
  };
};

/**
 * Create standardized pagination metadata for API responses
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {Array} data - Current page data array
 * @returns {Object} Pagination metadata object
 */
const createPaginationMetadata = (page, limit, total, data) => {
  return {
    pagination: {
      currentPage: page,                    // Current page number
      pageSize: limit,                      // Items per page
      totalItems: total,                    // Total items across all pages
      totalPages: Math.ceil(total / limit), // Total number of pages
      hasNextPage: page < Math.ceil(total / limit),  // If next page exists
      hasPreviousPage: page > 1,            // If previous page exists
      nextPage: page < Math.ceil(total / limit) ? page + 1 : null,  // Next page number
      previousPage: page > 1 ? page - 1 : null  // Previous page number
    },
    count: data.length  // Number of items in current page
  };
};

module.exports = {
  getPaginationParams,
  createPaginationMetadata
};