const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth/authController');
const validation = require('../../middleware/errorValidation/validation');
const passwordController = require('../../controllers/auth/passwordController');

router.post('/signup', validation.validateSignup, authController.signup);
router.post('/login', validation.validateLogin, authController.login);
router.post('/verify-otp', validation.validateVerifyOtp, authController.verifyOtp);
router.post('/forgot-password', 
  validation.validatePasswordResetRequest, 
  passwordController.requestReset
);

router.post('/reset-password', 
  validation.validatePasswordReset, 
  passwordController.resetPassword
);
module.exports = router;