// src/routes/customerSession/customerSession.js
const express = require('express');
const router = express.Router();
const {
  getSessionById,
  getUserSessions,
  getSessionAnalytics,
  getAbandonedSessions
} = require('../../controllers/customerSessionController/customerSessionController');
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');

/**
 * @route GET /api/customer-sessions/:sessionId
 * @description Get detailed session information including events
 * @access Private/Admin
 */
router.get('/:sessionId', authenticate, requireAdmin, getSessionById);

/**
 * @route GET /api/customer-sessions/user/:userId
 * @description Get all sessions for a specific user
 * @access Private/Admin
 */
router.get('/user/:userId', authenticate, requireAdmin, getUserSessions);

/**
 * @route GET /api/customer-sessions/analytics/abandoned
 * @description Get abandoned sessions analytics
 * @access Private/Admin
 */
router.get('/analytics/abandoned', authenticate, requireAdmin, getAbandonedSessions);

/**
 * @route GET /api/customer-sessions/analytics/conversion
 * @description Get conversion rate analytics
 * @access Private/Admin
 */
router.get('/analytics/conversion', authenticate, requireAdmin, getSessionAnalytics);

module.exports = router;