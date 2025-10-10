const crypto = require('crypto');
const { Op } = require('sequelize');
const { User } = require('../../models/user/User');
const emailService = require('./emailService');

class PasswordService {
  async requestPasswordReset(email) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token for DB
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hash + expiry in DB
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES) * 60 * 1000;
    await user.save();

    // Email reset link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;
    await emailService.sendPasswordResetEmail(email, resetUrl);

    return {
      message: 'If the email exists, a password reset link has been sent',
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    };
  }

  async resetPassword(email, token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        email,
        passwordResetToken: hashedToken,
        passwordResetExpires: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    await emailService.sendPasswordResetConfirmation(email);

    return { message: 'Password has been reset successfully' };
  }
}

module.exports = new PasswordService();
