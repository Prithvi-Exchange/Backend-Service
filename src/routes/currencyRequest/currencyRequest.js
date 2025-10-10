// src/routes/currencyRequest/currencyRequest.js
const express = require('express');
const router = express.Router();
const {
  createForexRequest,
  getAllForexRequests,
  getForexRequestById,
  updateForexRequest,
  deleteForexRequest,
  updateStatus,
  getUserForexRequests,
  trackFormAbandonment,
  trackFormProgress
} = require('../../controllers/forexController/forexController');
const { 
  validateForexRequest, 
  validateRequiredDocuments, 
  handleValidationErrors 
} = require('../../middleware/currencyRequest/currencyRequestValidation');
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');

/**
 * @route POST /api/forex
 * @description Create a new Forex Request with document URL validation and session tracking
 * @access Private
 * @body {Object} Forex request data with document URLs as strings
 */
router.post(
  '/', 
  authenticate, 
  validateForexRequest,
  validateRequiredDocuments,
  handleValidationErrors, 
  createForexRequest
);

/**
 * @route GET /api/forex
 * @description Get all Forex Requests with filtering and pagination
 * @access Private/Admin
 * @query {string} [city] - Filter by city
 * @query {string} [status] - Filter by status
 * @query {string} [purpose] - Filter by purpose
 */
router.get('/', authenticate, requireAdmin, getAllForexRequests);

/**
 * @route GET /api/forex/user/my-requests
 * @description Get authenticated user's Forex Requests
 * @access Private
 */
router.get('/user/my-requests', authenticate, getUserForexRequests);

/**
 * @route GET /api/forex/:id
 * @description Get a single Forex Request by ID
 * @access Private/Admin
 */
router.get('/:id', authenticate, requireAdmin, getForexRequestById);

/**
 * @route PUT /api/forex/:id
 * @description Update a Forex Request
 * @access Private/Admin
 */
router.put('/:id', authenticate, requireAdmin, updateForexRequest);

/**
 * @route DELETE /api/forex/:id
 * @description Delete a Forex Request
 * @access Private/Admin
 */
router.delete('/:id', authenticate, requireAdmin, deleteForexRequest);

/**
 * @route PATCH /api/forex/:id/status
 * @description Update status of a Forex Request
 * @access Private/Admin
 */
router.patch('/:id/status', authenticate, requireAdmin, updateStatus);

/**
 * @route POST /api/forex/track-abandonment
 * @description Track when user abandons forex form
 * @access Public (with session ID)
 */
router.post('/track-abandonment', trackFormAbandonment);

/**
 * @route POST /api/forex/track-progress
 * @description Track form filling progress
 * @access Public (with session ID)
 */
router.post('/track-progress', trackFormProgress);

module.exports = router;