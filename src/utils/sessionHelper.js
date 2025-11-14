const { trackEvent } = require('../middleware/customerSession/sessionTracker');

/**
 * Safely gets session ID from request with fallback
 * @param {Object} req - Express request object
 * @returns {string} Session ID
 */
const getSafeSessionId = (req) => {
  return req.sessionId || `sess_fallback_${Date.now()}`;
};

/**
 * Safely tracks events with session validation
 * @param {Object} req - Express request object
 * @param {Object} eventData - Event data to track
 * @returns {Promise} Promise that resolves when event is tracked
 */
const trackEventSafely = async (req, eventData) => {
  const sessionId = getSafeSessionId(req);
  
  // Only track events for real sessions, not fallbacks
  if (sessionId && !sessionId.startsWith('sess_fallback')) {
    try {
      await trackEvent(sessionId, eventData);
    } catch (error) {
      console.error('Failed to track event safely:', error);
      // Don't throw error, just log it
    }
  } else {
    console.log('Skipping event tracking for fallback session:', sessionId);
  }
};

/**
 * Validates if a session ID is a real session (not fallback)
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean} True if it's a real session
 */
const isValidSession = (sessionId) => {
  return sessionId && !sessionId.startsWith('sess_fallback');
};

/**
 * Extracts session ID from various request sources
 * @param {Object} req - Express request object
 * @returns {string|null} Session ID or null if not found
 */
const extractSessionId = (req) => {
  return req.headers['x-session-id'] || req.query.sessionId || req.body?.sessionId || null;
};

module.exports = {
  getSafeSessionId,
  trackEventSafely,
  isValidSession,
  extractSessionId
};