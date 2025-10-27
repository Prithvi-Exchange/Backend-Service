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
          timestamp: new Date().toISOString()
        }
      });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: {
          message: 'Invalid token: user not found',
          type: 'AUTH_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};