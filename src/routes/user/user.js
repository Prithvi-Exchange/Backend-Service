const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user/userController');
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');
const { body } = require('express-validator');

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
router.get('/', authenticate, requireAdmin, userController.getAllUsers);


/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', authenticate, userController.getUserById);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', 
  authenticate,
  [
    body('name')
      .optional()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters')
      .trim()
      .escape(),
    body('username')
      .optional()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters')
      .trim()
      .escape(),
    body('phoneNumber')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    body('address')
      .optional()
      .trim()
      .escape()
      .isLength({ max: 500 })
      .withMessage('Address must be less than 500 characters')
  ],
  userController.updateProfile
);

/**
 * @route   PUT /api/users/email
 * @desc    Update user email (requires verification)
 * @access  Private
 */
router.put('/email',
  authenticate,
  [
    body('newEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email')
  ],
  userController.updateEmail
);

/**
 * @route   POST /api/users/verify-phone
 * @desc    Verify phone number with OTP
 * @access  Private
 */
router.post('/verify-phone',
  authenticate,
  [
    body('phoneNumber')
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('OTP must be 6 digits')
  ],
  userController.verifyPhone
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/:id', authenticate, userController.deleteUser);

/**
 * @route   GET /api/users/stats/count
 * @desc    Get user statistics (Admin only)
 * @access  Private/Admin
 */
router.get('/stats/count', authenticate, requireAdmin, userController.getUserStats);

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
  ],
  userController.changePassword
);

module.exports = router;