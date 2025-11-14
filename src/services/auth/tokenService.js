// src/services/auth/tokenService.js
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const RefreshToken = require('../../models/auth/RefreshToken');
const { Op } = require('sequelize');

class TokenService {
  // Generate access token
  generateAccessToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
    );
  }

  // Generate refresh token
  generateRefreshToken() {
    return uuidv4();
  }

  // Store refresh token in database
  async storeRefreshToken(token, userId, deviceInfo = {}, ipAddress = null, deviceUuid = null, isBiometricEnabled = false) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    return await RefreshToken.create({
      token,
      userId,
      expiresAt,
      isRevoked: false,
      deviceInfo,
      ipAddress,
      deviceUuid,
      isBiometricEnabled
    });
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      throw new Error('Invalid access token');
    }
  }

  // Verify refresh token and return user data (via association)
  async verifyRefreshToken(token) {
    try {
      const refreshToken = await RefreshToken.findOne({
        where: {
          token,
          expiresAt: { [Op.gt]: new Date() },
          isRevoked: false
        },
        include: [{ model: require('../../models/user/User'), as: 'user' }]
      });

      if (!refreshToken) {
        throw new Error('Invalid or expired refresh token');
      }

      return refreshToken.user;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Revoke refresh token
  async revokeRefreshToken(token) {
    await RefreshToken.update(
      { isRevoked: true },
      { where: { token } }
    );
  }

  // Revoke all tokens for a user
  async revokeAllUserTokens(userId) {
    await RefreshToken.update(
      { isRevoked: true },
      { where: { userId } }
    );
  }

  // Clean up expired tokens
  async cleanupExpiredTokens() {
    const result = await RefreshToken.destroy({
      where: {
        expiresAt: { [Op.lt]: new Date() }
      }
    });
    console.log(`Cleaned up ${result} expired refresh tokens`);
    return result;
  }

  // Generate access & refresh, store refresh with deviceUuid + biometric flag
  async generateTokens(user, deviceInfo = {}, ipAddress = null, deviceUuid = null, isBiometricEnabled = false) {
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      user_type: user.user_type,
      is_admin: user.is_admin
    });

    const refreshToken = this.generateRefreshToken();

    await this.storeRefreshToken(
      refreshToken,
      user.id,
      deviceInfo,
      ipAddress,
      deviceUuid,
      isBiometricEnabled
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  // Mark biometric enabled for user+device (active tokens)
  async setBiometricEnabled(userId, deviceUuid, enabled) {
    if (!deviceUuid) {
      throw new Error('deviceUuid is required');
    }
    const [count] = await RefreshToken.update(
      { isBiometricEnabled: !!enabled },
      {
        where: {
          userId,
          deviceUuid,
          isRevoked: false,
          expiresAt: { [Op.gt]: new Date() }
        }
      }
    );
    return count;
  }

  // Check if there exists an active biometric-enabled token for user+device
  async hasActiveBiometricForDevice(userId, deviceUuid) {
    const row = await RefreshToken.findOne({
      where: {
        userId,
        deviceUuid,
        isBiometricEnabled: true,
        isRevoked: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    return !!row;
  }

  // Get user's active sessions
  async getUserSessions(userId) {
    return await RefreshToken.findAll({
      where: {
        userId,
        expiresAt: { [Op.gt]: new Date() },
        isRevoked: false
      },
      order: [['createdAt', 'DESC']]
    });
  }
}

module.exports = new TokenService();
