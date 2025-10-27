// src/routes/auth/tokenRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth/authController');
const { authenticate } = require('../../middleware/auth/auth');
const validation = require('../../middleware/errorValidation/validation');
const rateLimit = require('express-rate-limit');

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 refresh requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many token refresh attempts, please try again later.',
      type: 'RATE_LIMIT_ERROR',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token received during login
 *     responses:
 *       200:
 *         description: New access token generated successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', 
  refreshLimiter,
  validation.validateRefreshToken,
  authController.refreshTokens
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user and revoke refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token to revoke
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', 
  validation.validateRefreshToken,
  authController.logout
);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout user from all devices
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 */
router.post('/logout-all', 
  authenticate,
  authController.logoutAll
);

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: Get user's active sessions
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions retrieved successfully
 */
router.get('/sessions', 
  authenticate,
  authController.getUserSessions
);

module.exports = router;