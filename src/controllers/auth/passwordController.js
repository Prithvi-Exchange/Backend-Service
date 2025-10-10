// src/controllers/auth/passwordController.js
const passwordService = require('../../services/auth/passwordService');

class PasswordController {
  async requestReset(req, res, next) {
    try {
      const { email } = req.body;
      const result = await passwordService.requestPasswordReset(email);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { email, token, newPassword } = req.body;
      const result = await passwordService.resetPassword(email, token, newPassword);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PasswordController();