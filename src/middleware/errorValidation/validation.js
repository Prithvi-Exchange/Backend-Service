// src/middleware/errorValidation/validation.js
const { body } = require('express-validator');

exports.validateSignup = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phoneNumber')
    .optional()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid international phone number format (e.g., +918178352411)'),
  
  body('password')
    .isLength({ min: 8, max: 15 })
    .withMessage('Password must be between 8 and 15 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

exports.validateLogin = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phoneNumber')
    .optional()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid international phone number format'),
  
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phoneNumber) {
      throw new Error('Either email or phone number is required');
    }
    return true;
  })
];

exports.validateOtpLoginRequest = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phoneNumber')
    .optional()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid international phone number format'),
  
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phoneNumber) {
      throw new Error('Either email or phone number is required for OTP login');
    }
    return true;
  })
];

exports.validateOtpLogin = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phoneNumber')
    .optional()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid international phone number format'),
  
  body('otp')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('OTP must be 4 digits'),
  
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phoneNumber) {
      throw new Error('Either email or phone number is required');
    }
    return true;
  })
];

exports.validateVerifyOtp = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phoneNumber')
    .optional()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid international phone number format'),
  
  body('otp')
    .optional()
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('Email OTP must be 4 digits'),
  
  body('phoneOtp')
    .optional()
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('Phone OTP must be 4 digits'),
  
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phoneNumber) {
      throw new Error('Either email or phone number is required');
    }
    if (!req.body.otp && !req.body.phoneOtp) {
      throw new Error('At least one OTP (email or phone) is required');
    }
    return true;
  })
];

exports.validatePasswordResetRequest = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phoneNumber')
    .optional()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid international phone number format'),
  
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phoneNumber) {
      throw new Error('Either email or phone number is required');
    }
    return true;
  })
];

exports.validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 15 })
    .withMessage('Password must be between 8 and 15 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phoneNumber')
    .optional()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid international phone number format'),
  
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phoneNumber) {
      throw new Error('Either email or phone number is required');
    }
    return true;
  })
];

// New validation for refresh token
exports.validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isLength({ min: 36 })
    .withMessage('Invalid refresh token format')
];