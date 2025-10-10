// services/auth/authService.js
const jwt = require('jsonwebtoken');
const { User } = require('../../models/user/User');
const otpService = require('./otpService');
const emailService = require('./emailService');
const { Sequelize } = require('sequelize');
const { generateUsername } = require('../../utils/universalFunction.mjs');

// Security configuration
const securityConfig = {
  maxPasswordAttempts: parseInt(process.env.MAX_PASSWORD_ATTEMPTS) || 3,
  passwordLockoutDuration: parseInt(process.env.PASSWORD_LOCKOUT_DURATION) || 10 * 60 * 1000, // 10 minutes
  maxOtpAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS) || 3,
  otpLockoutDuration: parseInt(process.env.OTP_LOCKOUT_DURATION) || 10 * 60 * 1000, // 10 minutes
};

class AuthService {
  async signup(name, email, phoneNumber, password) {
    // Check if user is locked due to OTP attempts for this email
    if (email) {
      const lockedUser = await User.findOne({
        where: {
          email: email,
          otpLockedUntil: { [Sequelize.Op.gt]: new Date() }
        }
      });
      
      if (lockedUser) {
        const timeLeft = Math.ceil((lockedUser.otpLockedUntil - new Date()) / 1000 / 60);
        throw new Error(`Account temporarily locked due to too many OTP attempts. Try again in ${timeLeft} minutes.`);
      }
    }

    // Check if user already exists with email or phone
    const existingUser = await User.findOne({
      where: {
        [Sequelize.Op.or]: [
          { email: email || null },
          { phoneNumber: phoneNumber || null }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email && existingUser.isEmailVerified) {
        throw new Error('User with this email already exists and is verified');
      }
      if (existingUser.phoneNumber === phoneNumber && existingUser.isPhoneVerified) {
        throw new Error('User with this phone number already exists and is verified');
      }
      console.log('User exists but not verified, allowing re-registration');
    }

    // Check if at least one of email or phone is provided
    if (!email && !phoneNumber) {
      throw new Error('Either email or phone number is required');
    }

    // Create user data
    const userData = {
      name,
      password,
      isEmailVerified: false,
      isPhoneVerified: false,
      otpAttempts: 0, // Reset OTP attempts on new signup
      otpLockedUntil: null
    };

    if (email) {
      userData.email = email;
      userData.username = userData.username || generateUsername(email);
    }

    if (phoneNumber) {
      userData.phoneNumber = phoneNumber;
    }

    // If user already exists but not verified, update instead of create
    let user;
    if (existingUser) {
      user = await existingUser.update(userData);
    } else {
      user = await User.create(userData);
    }

    // Send OTP to email for verification
    if (email) {
      const otp = await otpService.generateOTP(email);
      await emailService.sendOTPEmail(email, otp.code);

      return {
        message: 'OTP sent to email for verification',
        email: email,
        userId: user.id,
        expiresAt: otp.expiresAt
      };
    } else {
      // For phone-only registration
      return {
        message: 'Phone registration requires SMS OTP implementation',
        phoneNumber: phoneNumber,
        userId: user.id
      };
    }
  }

  async login(email, phoneNumber, password) {
    // Find user by email or phone
    const conditions = [];
    if (email) conditions.push({ email });
    if (phoneNumber) conditions.push({ phoneNumber });

    if (conditions.length === 0) {
      throw new Error('Either email or phone number is required for login');
    }

    const user = await User.findOne({
      where: {
        [Sequelize.Op.or]: conditions
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if account is locked due to password attempts
    if (user.passwordLockedUntil && user.passwordLockedUntil > new Date()) {
      const timeLeft = Math.ceil((user.passwordLockedUntil - new Date()) / 1000 / 60);
      throw new Error(`Account temporarily locked due to too many failed attempts. Try again in ${timeLeft} minutes.`);
    }

    // Verify password
    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      // Increment password attempts
      const newAttempts = user.passwordAttempts + 1;
      let updateData = { passwordAttempts: newAttempts };

      // Lock account if max attempts reached
      if (newAttempts >= securityConfig.maxPasswordAttempts) {
        updateData.passwordLockedUntil = new Date(Date.now() + securityConfig.passwordLockoutDuration);
      }

      await user.update(updateData);

      const attemptsLeft = securityConfig.maxPasswordAttempts - newAttempts;
      
      if (attemptsLeft > 0) {
        throw new Error(`Invalid password. ${attemptsLeft} attempt(s) left.`);
      } else {
        const timeLeft = Math.ceil(securityConfig.passwordLockoutDuration / 1000 / 60);
        throw new Error(`Account locked due to too many failed attempts. Try again in ${timeLeft} minutes.`);
      }
    }

    // Reset password attempts on successful login
    if (user.passwordAttempts > 0 || user.passwordLockedUntil) {
      await user.update({
        passwordAttempts: 0,
        passwordLockedUntil: null
      });
    }

    // Check if email needs verification
    if (user.email && !user.isEmailVerified) {
      const otp = await otpService.generateOTP(user.email);
      await emailService.sendOTPEmail(user.email, otp.code);

      return {
        message: 'Email not verified. OTP sent to email for verification',
        email: user.email,
        userId: user.id,
        expiresAt: otp.expiresAt
      };
    }

    // Generate JWT token for successful login
    const token = this.generateToken(user);

    return {
      token,
      user: {
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
      }
    };
  }

  async verifyOtp(email, otpCode) {
    // Find the user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error('User not found. Please complete the signup process.');
    }

    // Check if OTP attempts are locked
    if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
      const timeLeft = Math.ceil((user.otpLockedUntil - new Date()) / 1000 / 60);
      throw new Error(`OTP verification temporarily locked. Try again in ${timeLeft} minutes.`);
    }

    const isValid = await otpService.verifyOTP(email, otpCode);

    if (!isValid) {
      // Increment OTP attempts
      const newAttempts = user.otpAttempts + 1;
      let updateData = { otpAttempts: newAttempts };

      // Lock OTP verification if max attempts reached
      if (newAttempts >= securityConfig.maxOtpAttempts) {
        updateData.otpLockedUntil = new Date(Date.now() + securityConfig.otpLockoutDuration);
      }

      await user.update(updateData);

      const attemptsLeft = securityConfig.maxOtpAttempts - newAttempts;
      
      if (attemptsLeft > 0) {
        throw new Error(`Invalid OTP. ${attemptsLeft} attempt(s) left.`);
      } else {
        const timeLeft = Math.ceil(securityConfig.otpLockoutDuration / 1000 / 60);
        throw new Error(`OTP verification locked due to too many failed attempts. Try again in ${timeLeft} minutes.`);
      }
    }

    // Reset OTP attempts on successful verification
    if (user.otpAttempts > 0 || user.otpLockedUntil) {
      await user.update({
        otpAttempts: 0,
        otpLockedUntil: null
      });
    }

    // Update email verification status
    user.isEmailVerified = true;
    await user.save();

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      token,
      user: {
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
      }
    };
  }

  generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        user_type: user.user_type,
        is_admin: user.is_admin
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '2m' }
    );
  }

  // Utility method to reset attempt counters (for admin purposes)
  async resetSecurityCounters(userId) {
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        passwordAttempts: 0,
        passwordLockedUntil: null,
        otpAttempts: 0,
        otpLockedUntil: null
      });
    }
    return user;
  }
}

module.exports = new AuthService();