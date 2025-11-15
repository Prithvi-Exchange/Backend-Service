// src/services/auth/authService.js
const jwt = require('jsonwebtoken');
const { User } = require('../../models/user/User');
const otpService = require('./otpService');
const emailService = require('./emailService');
const tokenService = require('./tokenService');
const { Sequelize } = require('sequelize');
const { generateUsername } = require('../../utils/universalFunction.js');

class AuthService {
  async signup(name, email, phoneNumber, password) {
    try {
      console.log(`Signup attempt: ${name}, ${email}, ${phoneNumber}`);

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
        isPhoneVerified: false
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

      // Send OTPs to both email and phone for verification
      const otpResults = {};

      if (email) {
        try {
          const emailOtp = await otpService.generateOTP(email, 'email_verification');
          await emailService.sendOTPEmail(email, emailOtp.code);
          otpResults.email = {
            message: 'OTP sent to email for verification',
            expiresAt: emailOtp.expiresAt
          };
        } catch (error) {
          console.error('Failed to send email OTP:', error);
          otpResults.email = {
            message: 'Failed to send email OTP',
            error: error.message
          };
        }
      }

      if (phoneNumber) {
        try {
          const phoneOtp = await otpService.generateOTP(phoneNumber, 'phone_verification');
          // TODO: Implement SMS service for phone OTP
          if (process.env.NODE_ENV === 'development') {
            console.log(`OTP for phone ${phoneNumber}: ${phoneOtp.code}`);
          }
          otpResults.phone = {
            message: 'OTP sent to phone for verification',
            expiresAt: phoneOtp.expiresAt
          };
        } catch (error) {
          console.error('Failed to send phone OTP:', error);
          otpResults.phone = {
            message: 'Failed to send phone OTP',
            error: error.message
          };
        }
      }

      return {
        message: 'User registered successfully. OTPs sent for verification.',
        email: email,
        phoneNumber: phoneNumber,
        userId: user.id,
        otpResults
      };
    } catch (error) {
      console.error('Signup service error:', error);
      throw error;
    }
  }

  async login(email, phoneNumber, password, deviceInfo = {}, ipAddress = null, deviceUuid = null) {
    try {
      console.log("Login attempt:", { email, phoneNumber });

      const conditions = [];
      if (email) conditions.push({ email });
      if (phoneNumber) conditions.push({ phoneNumber });

      if (conditions.length === 0) {
        throw new Error('Either email or phone number is required for login');
      }

      const user = await User.findOne({
        where: { [Sequelize.Op.or]: conditions }
      });

      if (!user) throw new Error('User not found');

      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) throw new Error('Invalid password');

      const verificationStatus = {};
      if (user.email && !user.isEmailVerified) verificationStatus.email = 'not_verified';
      if (user.phoneNumber && !user.isPhoneVerified) verificationStatus.phone = 'not_verified';

      if (Object.keys(verificationStatus).length > 0) {
        throw new Error('Account verification pending. Please verify your email/phone first.');
      }

      const tokens = await tokenService.generateTokens(
        user,
        deviceInfo,
        ipAddress,
        deviceUuid,       // <- NEW
        false             // isBiometricEnabled initially false unless you choose otherwise
      );

      return {
        tokens,
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
    } catch (error) {
      console.error('Login service error:', error);
      throw error;
    }
  }

  async requestOtpLogin(email, phoneNumber) {
    try {
      console.log("OTP login request:", { email, phoneNumber });

      const conditions = [];
      if (email) conditions.push({ email });
      if (phoneNumber) conditions.push({ phoneNumber });

      if (conditions.length === 0) {
        throw new Error('Either email or phone number is required for OTP login');
      }

      const user = await User.findOne({ where: { [Sequelize.Op.or]: conditions } });

      if (!user) {
        return { message: 'If the account exists, OTP has been sent' };
      }

      const otpResults = {};

      if (email) {
        try {
          const emailOtp = await otpService.generateOTP(email, 'email_login');
          await emailService.sendOTPEmail(email, emailOtp.code);
          otpResults.email = { message: 'OTP sent to email for login', expiresAt: emailOtp.expiresAt };
        } catch (error) {
          console.error('Failed to send email OTP:', error);
          otpResults.email = { message: 'Failed to send email OTP', error: error.message };
        }
      }

      if (phoneNumber) {
        try {
          const phoneOtp = await otpService.generateOTP(phoneNumber, 'phone_login');
          if (process.env.NODE_ENV === 'development') {
            console.log(`Login OTP for phone ${phoneNumber}: ${phoneOtp.code}`);
          }
          otpResults.phone = { message: `OTP sent to phone for login : ${phoneOtp.code}`, expiresAt: phoneOtp.expiresAt };
        } catch (error) {
          console.error('Failed to send phone OTP:', error);
          otpResults.phone = { message: 'Failed to send phone OTP', error: error.message };
        }
      }

      return {
        message: 'OTP sent successfully',
        identifier: email || phoneNumber,
        otpResults
      };
    } catch (error) {
      console.error('OTP login request error:', error);
      throw error;
    }
  }

  async verifyOtpLogin(email, phoneNumber, otpCode, deviceInfo = {}, ipAddress = null, deviceUuid = null) {
    try {
      const identifier = email || phoneNumber;

      console.log(`OTP login verification: ${identifier}, code: ${otpCode}`);

      const isValid = await otpService.verifyOTP(identifier, otpCode);
      if (!isValid) throw new Error('Invalid OTP');

      const conditions = [];
      if (email) conditions.push({ email });
      if (phoneNumber) conditions.push({ phoneNumber });

      const user = await User.findOne({ where: { [Sequelize.Op.or]: conditions } });
      if (!user) throw new Error('User not found');

      const tokens = await tokenService.generateTokens(
        user,
        deviceInfo,
        ipAddress,
        deviceUuid,     // <- NEW
        false
      );

      return {
        tokens,
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
    } catch (error) {
      console.error('OTP login verification error:', error);
      throw error;
    }
  }

  async verifyOtp(email, otpCode, phoneNumber, phoneOtp, deviceInfo = {}, ipAddress = null, deviceUuid = null) {
    try {
      console.log(`OTP verification: email=${email}, phone=${phoneNumber}`);

      const user = await User.findOne({
        where: {
          [Sequelize.Op.or]: [
            { email: email || null },
            { phoneNumber: phoneNumber || null }
          ]
        }
      });

      if (!user) throw new Error('User not found. Please complete the signup process.');

      const verificationResults = {};
      let isFullyVerified = true;

      if (email && otpCode) {
        try {
          const isValidEmailOtp = await otpService.verifyOTP(email, otpCode);
          if (isValidEmailOtp) {
            user.isEmailVerified = true;
            verificationResults.email = 'verified';
          } else {
            verificationResults.email = 'invalid_otp';
            isFullyVerified = false;
          }
        } catch (error) {
          verificationResults.email = 'invalid_otp';
          isFullyVerified = false;
        }
      }

      if (phoneNumber && phoneOtp) {
        try {
          const isValidPhoneOtp = await otpService.verifyOTP(phoneNumber, phoneOtp);
          if (isValidPhoneOtp) {
            user.isPhoneVerified = true;
            verificationResults.phone = 'verified';
          } else {
            verificationResults.phone = 'invalid_otp';
            isFullyVerified = false;
          }
        } catch (error) {
          verificationResults.phone = 'invalid_otp';
          isFullyVerified = false;
        }
      }

      await user.save();

      if (!isFullyVerified) {
        throw new Error('Some OTPs are invalid. Please check and try again.');
      }

      const tokens = await tokenService.generateTokens(
        user,
        deviceInfo,
        ipAddress,
        deviceUuid,   // <- NEW
        false
      );

      return {
        tokens,
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
        },
        verificationResults
      };
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  }

  async refreshTokens(refreshToken, deviceInfo = {}, ipAddress = null) {
    try {
      console.log("Refresh token attempt");

      const user = await tokenService.verifyRefreshToken(refreshToken);

      // Revoke the old refresh token
      await tokenService.revokeRefreshToken(refreshToken);

      // NOTE: deviceUuid is unknown in refresh route unless you pass it.
      // We keep it null, biometric flag false for new token by default.
      const tokens = await tokenService.generateTokens(
        user,
        deviceInfo,
        ipAddress,
        null,
        false
      );

      return {
        tokens,
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
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  async logout(refreshToken) {
    try {
      await tokenService.revokeRefreshToken(refreshToken);
      return { message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async logoutAllDevices(userId) {
    try {
      await tokenService.revokeAllUserTokens(userId);
      return { message: 'Logged out from all devices successfully' };
    } catch (error) {
      console.error('Logout all error:', error);
      throw error;
    }
  }

  async getUserSessions(userId) {
    try {
      const sessions = await tokenService.getUserSessions(userId);
      return sessions;
    } catch (error) {
      console.error('Get user sessions error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
