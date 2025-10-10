const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const OTP = require('../../models/otp/OTP');

class OTPService {
  async generateOTP(email) {
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the OTP before storing
    const hashedCode = await bcrypt.hash(code, 10);

    // Set expiry (5 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(process.env.OTP_EXPIRY_MINUTES || '5'));

    // Invalidate previous OTPs for this email
    await OTP.update(
      { isUsed: true },
      { where: { email, isUsed: false } }
    );

    // Create new OTP
    const otp = await OTP.create({
      code: hashedCode,
      email,
      expiresAt
    });

    return { id: otp.id, code, expiresAt };
  }

  async verifyOTP(email, code) {
    const otp = await OTP.findOne({
      where: {
        email,
        isUsed: false,
        expiresAt: { [Sequelize.Op.gt]: new Date() }
      },
      order: [['createdAt', 'DESC']]
    });

    if (!otp) {
      return false;
    }

    // Verify OTP code
    const isValid = await bcrypt.compare(code, otp.code);
    
    if (isValid) {
      // Mark OTP as used
      await OTP.update({ isUsed: true }, { where: { id: otp.id } });
      return true;
    }

    return false;
  }
}

module.exports = new OTPService();