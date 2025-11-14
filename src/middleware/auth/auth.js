// src/middleware/auth/authenticate.js
const { User } = require('../../models/user/User');
const tokenService = require('../../services/auth/tokenService');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          type: 'AUTH_ERROR',
          code: 'NO_ACCESS_TOKEN',
          timestamp: new Date().toISOString()
        }
      });
    }

    let decoded;
    try {
      decoded = tokenService.verifyAccessToken(token);
    } catch (error) {
      if (error.message === 'Access token expired') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Access token expired',
            type: 'TOKEN_EXPIRED',
            code: 'ACCESS_TOKEN_EXPIRED',
            timestamp: new Date().toISOString()
          }
        });
      }

      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid access token',
          type: 'AUTH_ERROR',
          code: 'INVALID_ACCESS_TOKEN',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Retrieve user
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token: user not found',
          type: 'AUTH_ERROR',
          code: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Optional: extract deviceUUID from headers (sent by app)
    const deviceUuid = req.header('x-device-uuid') || null;

    // Attach normalized context
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      user_type: user.user_type,
      is_admin: user.is_admin
    };

    // Additional device metadata for downstream services/logs
    req.userContext = {
      deviceUuid,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    };

    next();
  } catch (error) {
    console.error('authenticate middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during authentication',
        type: 'SERVER_ERROR',
        code: 'AUTH_MIDDLEWARE_FAILURE',
        timestamp: new Date().toISOString()
      }
    });
  }
};
