// src/routes/customerEvent/customerEvent.js
const express = require('express');
const router = express.Router();
const {
  trackFormAbandonment,
  trackFormProgress
} = require('../../controllers/forexController/forexController'); // Using forex controller functions

/**
 * @route POST /api/customer-events/track
 * @description Track custom customer events
 * @access Public (with session ID)
 * @body {string} sessionId - Customer session ID
 * @body {string} eventType - Type of event
 * @body {string} eventName - Name of the event
 * @body {Object} metadata - Additional event data
 */

/**
 * @route POST /api/customer-events/form-abandonment
 * @description Track when user abandons forex form
 * @access Public (with session ID)
 * @body {string} sessionId - Customer session ID
 * @body {Object} formData - Form data at time of abandonment
 * @body {string} reason - Reason for abandonment
 */
router.post('/form-abandonment', trackFormAbandonment);

/**
 * @route POST /api/customer-events/form-progress
 * @description Track form filling progress
 * @access Public (with session ID)
 * @body {string} sessionId - Customer session ID
 * @body {string} step - Current form step
 * @body {number} progress - Completion percentage
 * @body {Object} formData - Current form data
 */
router.post('/form-progress', trackFormProgress);

module.exports = router;