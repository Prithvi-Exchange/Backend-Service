const { body } = require('express-validator');

// Custom password strength validator
const passwordStrengthValidator = (value) => {
  if (value.length < 8 || value.length > 15) {
    throw new Error('Password must be between 8 and 15 characters long');
  }
  
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  if (!strongRegex.test(value)) {
    throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
  }
  
  return true;
};

// Custom phone number validator for international format
const phoneNumberValidator = (value) => {
  const phoneRegex = /^\+\d{10,15}$/; // + followed by 10-15 digits
  if (!phoneRegex.test(value)) {
    throw new Error('Phone number must be in international format like +918178352411');
  }
  return true;
};

exports.validateSignup = [
  body('name')
    .isLength({ min: 2 })
    .trim()
    .escape()
    .withMessage('Name must be at least 2 characters long'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phoneNumber')
    .custom(phoneNumberValidator)
    .withMessage('Please provide a valid phone number in international format (e.g., +918178352411)'),
  
  body('password')
    .isLength({ min: 8, max: 15 })
    .withMessage('Password must be between 8 and 15 characters long')
    .custom(passwordStrengthValidator)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

exports.validateLogin = [
  body('email')
    .if(body('email').exists())
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phoneNumber')
    .if(body('phoneNumber').exists())
    .custom(phoneNumberValidator)
    .withMessage('Please provide a valid phone number in international format (e.g., +918178352411)'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

exports.validateVerifyOtp = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits')
];

exports.validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

exports.validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 15 })
    .withMessage('Password must be between 8 and 15 characters long')
    .custom(passwordStrengthValidator)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];