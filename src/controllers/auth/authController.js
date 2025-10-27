// src/controllers/auth/authController.js
const { validationResult } = require('express-validator');
const authService = require('../../services/auth/authService');
const { AppError } = require('../../middleware/errorValidation/errorHandler');

exports.signup = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { name, email, phoneNumber, password } = req.body;
    const result = await authService.signup(name, email, phoneNumber, password);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (error) {
    console.error("Signup error:", error);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { email, phoneNumber, password } = req.body;
    console.log("Login request:", { email, phoneNumber });
    
    const deviceInfo = {
      userAgent: req.get('User-Agent'),
    };
    const ipAddress = req.ip;

    const result = await authService.login(email, phoneNumber, password, deviceInfo, ipAddress);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
};

exports.requestOtpLogin = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { email, phoneNumber } = req.body;
    const result = await authService.requestOtpLogin(email, phoneNumber);
    
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: result
    });
  } catch (error) {
    console.error("OTP login request error:", error);
    next(error);
  }
};

exports.verifyOtpLogin = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { email, phoneNumber, otp } = req.body;
    
    const deviceInfo = {
      userAgent: req.get('User-Agent'),
    };
    const ipAddress = req.ip;

    const result = await authService.verifyOtpLogin(email, phoneNumber, otp, deviceInfo, ipAddress);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    console.error("OTP login verification error:", error);
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { email, otp, phoneNumber, phoneOtp } = req.body;
    
    const deviceInfo = {
      userAgent: req.get('User-Agent'),
    };
    const ipAddress = req.ip;

    const result = await authService.verifyOtp(email, otp, phoneNumber, phoneOtp, deviceInfo, ipAddress);
    
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: result
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    next(error);
  }
};

// New methods for token management
exports.refreshTokens = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { refreshToken } = req.body;
    const deviceInfo = {
      userAgent: req.get('User-Agent'),
    };
    const ipAddress = req.ip;

    const result = await authService.refreshTokens(refreshToken, deviceInfo, ipAddress);
    
    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: result
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { refreshToken } = req.body;
    const result = await authService.logout(refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: result
    });
  } catch (error) {
    console.error("Logout error:", error);
    next(error);
  }
};

exports.logoutAll = async (req, res, next) => {
  try {
    const result = await authService.logoutAllDevices(req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
      data: result
    });
  } catch (error) {
    console.error("Logout all error:", error);
    next(error);
  }
};

exports.getUserSessions = async (req, res, next) => {
  try {
    const result = await authService.getUserSessions(req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Sessions retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error("Get user sessions error:", error);
    next(error);
  }
};