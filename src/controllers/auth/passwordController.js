// src/controllers/auth/passwordController.js
const passwordService = require('../../services/auth/passwordService');

class PasswordController {
  async requestReset(req, res, next) {
    try {
      const { email, phoneNumber } = req.body;
      
      // Use email if provided, otherwise use phoneNumber
      const identifier = email || phoneNumber;
      const identifierType = email ? 'email' : 'phoneNumber';
      
      await passwordService.requestPasswordReset(identifier, identifierType);
      
      // Always return same response to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If the account exists, a password reset instruction has been sent'
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { email, phoneNumber, token, newPassword } = req.body;
      
      // Use email if provided, otherwise use phoneNumber
      const identifier = email || phoneNumber;
      const identifierType = email ? 'email' : 'phoneNumber';
      
      const result = await passwordService.resetPassword(identifier, identifierType, token, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PasswordController();