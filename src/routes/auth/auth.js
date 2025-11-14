// src/routes/auth/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth/authController');
const validation = require('../../middleware/errorValidation/validation');
const passwordController = require('../../controllers/auth/passwordController');
const rateLimit = require('express-rate-limit');

// Import token routes
const tokenRoutes = require('./tokenRoutes');
// NEW: import biometric sub-routes
const biometricRoutes = require('./biometricRoutes');

// Rate limiting configuration
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      message: 'Too many password reset attempts, please try again after 15 minutes',
      type: 'RATE_LIMIT_ERROR',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again after 15 minutes',
      type: 'RATE_LIMIT_ERROR',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    error: {
      message: 'Too many OTP requests, please try again after 15 minutes',
      type: 'RATE_LIMIT_ERROR',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.use(authLimiter);

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user account with dual OTP verification
 *     tags: [Authentication]
 */
router.post('/signup', validation.validateSignup, authController.signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user with password
 *     tags: [Authentication]
 */
router.post('/login', validation.validateLogin, authController.login);

/**
 * @swagger
 * /auth/request-otp-login:
 *   post:
 *     summary: Request OTP for passwordless login
 *     tags: [Authentication]
 */
router.post(
  '/request-otp-login',
  otpLimiter,
  validation.validateOtpLoginRequest,
  authController.requestOtpLogin
);

/**
 * @swagger
 * /auth/verify-otp-login:
 *   post:
 *     summary: Verify OTP for passwordless login
 *     tags: [Authentication]
 */
router.post(
  '/verify-otp-login',
  otpLimiter,
  validation.validateOtpLogin,
  authController.verifyOtpLogin
);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTPs for email and phone verification
 *     tags: [Authentication]
 */
router.post(
  '/verify-otp',
  otpLimiter,
  validation.validateVerifyOtp,
  authController.verifyOtp
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset instructions
 *     tags: [Authentication]
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validation.validatePasswordResetRequest,
  passwordController.requestReset
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset user password using reset token
 *     tags: [Authentication]
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  validation.validatePasswordReset,
  passwordController.resetPassword
);

// Use token routes
router.use('/', tokenRoutes);

// NEW: mount biometric routes
router.use('/', biometricRoutes);

module.exports = router;
