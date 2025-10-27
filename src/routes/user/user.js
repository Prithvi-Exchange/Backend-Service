const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user/userController');
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');
const { body } = require('express-validator');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and profile operations
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: |
 *       Retrieve paginated list of all registered users.
 *       - Requires admin privileges
 *       - Returns users with pagination metadata
 *       - Excludes sensitive information like passwords
 *       - Ordered by creation date (newest first)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: "Page number for pagination (default: 1)"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *       - name: limit
 *         in: query
 *         description: "Number of users per page (default: 10, max: 100)"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           example: 10
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Users fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "user_123456"
 *                         description: "Unique user identifier"
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                         description: "User's full name"
 *                       email:
 *                         type: string
 *                         example: "john.doe@example.com"
 *                         description: "User's email address"
 *                       phoneNumber:
 *                         type: string
 *                         example: "+918178352411"
 *                         description: "User's phone number in international format"
 *                       isEmailVerified:
 *                         type: boolean
 *                         example: true
 *                         description: "Email verification status"
 *                       isPhoneVerified:
 *                         type: boolean
 *                         example: false
 *                         description: "Phone number verification status"
 *                       user_type:
 *                         type: integer
 *                         example: 2
 *                         description: "User type (1=Admin, 2=Regular user)"
 *                       is_admin:
 *                         type: boolean
 *                         example: false
 *                         description: "Administrative privileges flag"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-10-15T08:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-10-20T12:45:00.000Z"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalCount:
 *                       type: integer
 *                       example: 150
 *                     totalPages:
 *                       type: integer
 *                       example: 15
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, requireAdmin, userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: |
 *       Retrieve specific user details by user ID.
 *       - Users can view their own profile
 *       - Admins can view any user profile
 *       - Sensitive data is excluded from response
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: User ID to retrieve
 *         required: true
 *         schema:
 *           type: string
 *           example: "user_123456"
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "user_123456"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+918178352411"
 *                     isEmailVerified:
 *                       type: boolean
 *                       example: true
 *                     isPhoneVerified:
 *                       type: boolean
 *                       example: false
 *                     address:
 *                       type: string
 *                       example: "123 Main Street, Mumbai, India"
 *                     user_type:
 *                       type: integer
 *                       example: 2
 *                     is_admin:
 *                       type: boolean
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Cannot access other user's data without admin privileges
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticate, userController.getUserById);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update user profile information
 *     description: |
 *       Update authenticated user's profile details.
 *       - Only name, username, phone number, and address can be updated
 *       - Email updates require separate verification process
 *       - All changes are validated and sanitized
 *       - Phone number updates require re-verification
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Smith"
 *                 description: "Updated full name (minimum 2 characters)"
 *                 minLength: 2
 *               username:
 *                 type: string
 *                 example: "johnsmith"
 *                 description: "Unique username (minimum 3 characters)"
 *                 minLength: 3
 *               phoneNumber:
 *                 type: string
 *                 example: "+918178352412"
 *                 description: "Updated phone number in international format"
 *               address:
 *                 type: string
 *                 example: "456 Park Avenue, New Delhi, India"
 *                 description: "User's physical address (maximum 500 characters)"
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "user_123456"
 *                     name:
 *                       type: string
 *                       example: "John Smith"
 *                     username:
 *                       type: string
 *                       example: "johnsmith"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+918178352412"
 *                     isEmailVerified:
 *                       type: boolean
 *                       example: true
 *                     isPhoneVerified:
 *                       type: boolean
 *                       example: false
 *                     address:
 *                       type: string
 *                       example: "456 Park Avenue, New Delhi, India"
 *                     user_type:
 *                       type: integer
 *                       example: 2
 *                     is_admin:
 *                       type: boolean
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
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
 * @swagger
 * /users/email:
 *   put:
 *     summary: Request email update with OTP verification
 *     description: |
 *       Initiate email change process by sending OTP to new email address.
 *       - Sends verification OTP to the new email
 *       - Current email remains active until verification
 *       - Prevents email duplication across users
 *       - OTP valid for limited time (typically 10 minutes)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newEmail
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *                 example: "john.newemail@example.com"
 *                 description: "New email address for verification"
 *     responses:
 *       200:
 *         description: OTP sent to new email for verification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP sent to new email for verification"
 *                 data:
 *                   type: object
 *                   properties:
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-10-25T14:30:00.000Z"
 *                       description: "OTP expiration timestamp"
 *                     email:
 *                       type: string
 *                       example: "john.newemail@example.com"
 *                     message:
 *                       type: string
 *                       example: "Check your email for verification code"
 *       400:
 *         description: Validation error or email already taken
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many OTP requests
 *       500:
 *         description: Internal server error
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
 * @swagger
 * /users/verify-phone:
 *   post:
 *     summary: Verify phone number with OTP
 *     description: |
 *       Verify phone number using One-Time Password.
 *       - OTP sent via SMS to provided phone number
 *       - Updates phone verification status upon success
 *       - Required for certain financial transactions
 *       - Enhances account security
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - otp
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+918178352411"
 *                 description: "Phone number to verify (international format)"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: "6-digit OTP received via SMS"
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: Phone number verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Phone number verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "user_123456"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     username:
 *                       type: string
 *                       example: "johndoe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+918178352411"
 *                     isEmailVerified:
 *                       type: boolean
 *                       example: true
 *                     isPhoneVerified:
 *                       type: boolean
 *                       example: true
 *                     address:
 *                       type: string
 *                       example: "123 Main Street, Mumbai, India"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid OTP or validation error
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
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
 * @swagger
 * /users/change-password:
 *   put:
 *     summary: Change user password
 *     description: |
 *       Update user password with current password verification.
 *       - Requires current password for security
 *       - New password must meet security requirements
 *       - Invalidates all existing sessions after password change
 *       - Password is automatically hashed before storage
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: "CurrentPass123!"
 *                 description: "Current password for verification"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "NewSecurePass456!"
 *                 description: "New password (minimum 6 characters)"
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully"
 *       400:
 *         description: Current password incorrect or validation error
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
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

/**
 * @swagger
 * /users/me/profile:
 *   get:
 *     summary: Get current user profile
 *     description: |
 *       Retrieve authenticated user's complete profile information.
 *       - Returns all user details except sensitive data
 *       - Includes verification status and account type
 *       - Useful for profile display and settings pages
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "user_123456"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     username:
 *                       type: string
 *                       example: "johndoe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+918178352411"
 *                     isEmailVerified:
 *                       type: boolean
 *                       example: true
 *                     isPhoneVerified:
 *                       type: boolean
 *                       example: false
 *                     address:
 *                       type: string
 *                       example: "123 Main Street, Mumbai, India"
 *                     user_type:
 *                       type: integer
 *                       example: 2
 *                     is_admin:
 *                       type: boolean
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/me/profile', authenticate, userController.getMyProfile);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user account
 *     description: |
 *       Permanently delete user account from the system.
 *       - Users can delete their own account
 *       - Admins can delete any user account
 *       - Irreversible action - all user data is removed
 *       - Requires confirmation in production
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: User ID to delete
 *         required: true
 *         schema:
 *           type: string
 *           example: "user_123456"
 *     responses:
 *       200:
 *         description: User account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User account deleted successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Cannot delete other user's account without admin privileges
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, userController.deleteUser);

/**
 * @swagger
 * /users/stats/count:
 *   get:
 *     summary: Get user statistics (Admin only)
 *     description: |
 *       Retrieve comprehensive user statistics for admin dashboard.
 *       - Total user counts and verification rates
 *       - Admin user statistics
 *       - Useful for business intelligence and monitoring
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User statistics fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 150
 *                       description: "Total number of registered users"
 *                     verifiedUsers:
 *                       type: integer
 *                       example: 120
 *                       description: "Number of email-verified users"
 *                     phoneVerifiedUsers:
 *                       type: integer
 *                       example: 95
 *                       description: "Number of phone-verified users"
 *                     adminUsers:
 *                       type: integer
 *                       example: 5
 *                       description: "Number of admin users"
 *                     unverifiedUsers:
 *                       type: integer
 *                       example: 30
 *                       description: "Number of unverified users"
 *                     verificationRate:
 *                       type: string
 *                       example: "80.00%"
 *                       description: "Percentage of verified users"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       500:
 *         description: Internal server error
 */
router.get('/stats/count', authenticate, requireAdmin, userController.getUserStats);

module.exports = router;