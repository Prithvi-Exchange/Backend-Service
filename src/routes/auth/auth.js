// src/routes/auth/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth/authController');
const validation = require('../../middleware/errorValidation/validation');
const passwordController = require('../../controllers/auth/passwordController');
const rateLimit = require('express-rate-limit');

// Import token routes
const tokenRoutes = require('./tokenRoutes');

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
 *     description: |
 *       Create a new user account with email, phone number, and secure password.
 *       - Sends OTP to both email and phone number for verification
 *       - Both OTPs need to be verified for full account activation
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               phoneNumber:
 *                 type: string
 *                 example: "+918178352411"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass123!"
 *     responses:
 *       201:
 *         description: User registered successfully, OTPs sent for verification
 */
router.post('/signup', validation.validateSignup, authController.signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user with password
 *     description: Login using email OR phone number with password. Returns access token and refresh token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             oneOf:
 *               - required: [email]
 *               - required: [phoneNumber]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                         accessTokenExpires:
 *                           type: string
 *                     user:
 *                       type: object
 */
router.post('/login', validation.validateLogin, authController.login);

/**
 * @swagger
 * /auth/request-otp-login:
 *   post:
 *     summary: Request OTP for passwordless login
 *     description: Request OTP to be sent to email or phone for login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             oneOf:
 *               - required: [email]
 *               - required: [phoneNumber]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post('/request-otp-login', 
  otpLimiter,
  validation.validateOtpLoginRequest, 
  authController.requestOtpLogin
);

/**
 * @swagger
 * /auth/verify-otp-login:
 *   post:
 *     summary: Verify OTP for passwordless login
 *     description: Login using OTP sent to email or phone. Returns access token and refresh token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             oneOf:
 *               - required: [email]
 *               - required: [phoneNumber]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/verify-otp-login', 
  otpLimiter,
  validation.validateOtpLogin, 
  authController.verifyOtpLogin
);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTPs for email and phone verification
 *     description: |
 *       Verify OTPs sent during signup for both email and phone verification.
 *       - Can verify both OTPs in single request or separately
 *       - Account fully activated when both are verified
 *       - Returns access token and refresh token upon successful verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *                 description: "Email OTP"
 *               phoneOtp:
 *                 type: string
 *                 description: "Phone OTP"
 *     responses:
 *       200:
 *         description: OTPs verified successfully
 */
router.post('/verify-otp', 
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
router.post('/forgot-password', 
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
router.post('/reset-password', 
  passwordResetLimiter,
  validation.validatePasswordReset, 
  passwordController.resetPassword
);

// Use token routes
router.use('/', tokenRoutes);

module.exports = router;