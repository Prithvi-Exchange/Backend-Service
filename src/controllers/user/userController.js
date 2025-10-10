const { validationResult } = require('express-validator');
const { User } = require('../../models/user/User');
const otpService = require('../../services/auth/otpService');
const emailService = require('../../services/auth/emailService');
const { successResponse, errorResponse } = require('../../middleware/response/responseFormatter');
const { getPaginationParams, createPaginationMetadata } = require('../../middleware/response/pagination');

/**
 * Get all users with pagination (Admin only)
 * @route GET /api/users
 * @access Private/Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    
    // Fetch users with pagination, excluding password field for security
    const { count, rows } = await User.findAndCountAll({
      attributes: { 
        exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] 
      },
      order: [['createdAt', 'DESC']], // Latest users first
      limit: limit,
      offset: offset
    });

    const metadata = createPaginationMetadata(page, limit, count, rows);
    
    return successResponse(res, rows, 'Users fetched successfully', 200, metadata);
  } catch (error) {
    console.error('Get all users error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @access Private
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { 
        exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] 
      }
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User fetched successfully', 200);
  } catch (error) {
    console.error('Get user by ID error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateProfile = async (req, res) => {
  try {
    // Check for validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { name, username, phoneNumber, address } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Update allowed fields only
    if (name !== undefined) user.name = name;
    if (username !== undefined) user.username = username;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (address !== undefined) user.address = address;

    await user.save();

    // Prepare response without sensitive data
    const userResponse = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      address: user.address,
      user_type: user.user_type,
      is_admin: user.is_admin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return successResponse(res, userResponse, 'Profile updated successfully', 200);
  } catch (error) {
    console.error('Update profile error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update user email (requires OTP verification)
 * @route PUT /api/users/email
 * @access Private
 */
exports.updateEmail = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { newEmail } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ where: { email: newEmail } });
    if (existingUser && existingUser.id !== user.id) {
      return errorResponse(res, 'Email already taken', 400);
    }

    // Send OTP for email verification
    const otp = await otpService.generateOTP(newEmail);
    await emailService.sendOTPEmail(newEmail, otp.code);

    const responseData = {
      expiresAt: otp.expiresAt,
      email: newEmail,
      message: 'Check your email for verification code'
    };

    return successResponse(res, responseData, 'OTP sent to new email for verification', 200);
  } catch (error) {
    console.error('Update email error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Verify phone number with OTP
 * @route POST /api/users/verify-phone
 * @access Private
 */
exports.verifyPhone = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { phoneNumber, otp } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // In a real application, you'd verify the phone OTP with a service like Twilio
    // For now, we'll simulate verification (in production, implement proper OTP verification)
    
    // Simulate OTP verification (replace with actual OTP service)
    const isOtpValid = await otpService.verifyOTP(phoneNumber, otp);
    
    if (!isOtpValid) {
      return errorResponse(res, 'Invalid OTP', 400);
    }

    // Update user phone number and verification status
    user.phoneNumber = phoneNumber;
    user.isPhoneVerified = true;
    await user.save();

    // Prepare response data
    const userResponse = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      address: user.address,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return successResponse(res, userResponse, 'Phone number verified successfully', 200);
  } catch (error) {
    console.error('Verify phone error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete user account
 * @route DELETE /api/users/:id
 * @access Private
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check if user is deleting their own account or is admin
    if (user.id !== req.user.id && !req.user.is_admin) {
      return errorResponse(res, 'Access denied. You can only delete your own account.', 403);
    }

    await user.destroy();

    return successResponse(res, null, 'User account deleted successfully', 200);
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get user statistics (Admin only)
 * @route GET /api/users/stats/count
 * @access Private/Admin
 */
exports.getUserStats = async (req, res) => {
  try {
    // Get various user counts for dashboard statistics
    const totalUsers = await User.count();
    const verifiedUsers = await User.count({ where: { isEmailVerified: true } });
    const phoneVerifiedUsers = await User.count({ where: { isPhoneVerified: true } });
    const adminUsers = await User.count({ where: { is_admin: true } });

    // Prepare statistics object
    const stats = {
      totalUsers,
      verifiedUsers,
      phoneVerifiedUsers,
      adminUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
      verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) + '%' : '0%'
    };

    return successResponse(res, stats, 'User statistics fetched successfully', 200);
  } catch (error) {
    console.error('Get user stats error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Change user password
 * @route PUT /api/users/change-password
 * @access Private
 */
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Verify current password
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    // Update to new password (automatically hashed by model hooks)
    user.password = newPassword;
    await user.save();

    return successResponse(res, null, 'Password changed successfully', 200);
  } catch (error) {
    console.error('Change password error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get current user profile
 * @route GET /api/users/me/profile
 * @access Private
 */
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { 
        exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] 
      }
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'Profile fetched successfully', 200);
  } catch (error) {
    console.error('Get my profile error:', error);
    return errorResponse(res, error.message, 500);
  }
};