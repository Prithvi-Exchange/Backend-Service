const { Op } = require('sequelize');
const OTP = require('../../models/otp/OTP');

class OTPService {
  async generateOTP(identifier, type = 'email_verification') {
    try {
      console.log(`Generating OTP for identifier: ${identifier}, type: ${type}`);
      
      // Generate 6-digit OTP
const code = Math.floor(1000 + Math.random() * 9000).toString();      
      // Set expiration (default 10 minutes)
      const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000);

      // Delete any existing OTPs for this email/identifier
      await OTP.destroy({
        where: {
          email: identifier
        }
      });

      // Create new OTP
      const otp = await OTP.create({
        email: identifier,
        code,
        expiresAt,
        isUsed: false
      });

      console.log(`OTP generated successfully for ${identifier}: ${code}`);

      return {
        code,
        expiresAt,
        id: otp.id
      };
    } catch (error) {
      console.error('Error generating OTP:', error);
      throw new Error(`Failed to generate OTP: ${error.message}`);
    }
  }

  async verifyOTP(identifier, code, type = 'email_verification') {
    try {
      console.log(`Verifying OTP for identifier: ${identifier}, code: ${code}`);
      
      const otp = await OTP.findOne({
        where: {
          email: identifier,
          code: code,
          expiresAt: {
            [Op.gt]: new Date()
          },
          isUsed: false
        }
      });

      if (!otp) {
        throw new Error('OTP not found, expired or already used');
      }

      // Mark OTP as used
      otp.isUsed = true;
      await otp.save();

      console.log(`OTP verified successfully for ${identifier}`);
      return true;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error(`OTP verification failed: ${error.message}`);
    }
  }

  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.destroy({
        where: {
          expiresAt: {
            [Op.lt]: new Date()
          }
        }
      });
      console.log(`Cleaned up ${result} expired OTPs`);
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  // Method to check if OTP exists and is valid
  async checkOTP(identifier, code) {
    try {
      const otp = await OTP.findOne({
        where: {
          email: identifier,
          code: code,
          expiresAt: {
            [Op.gt]: new Date()
          },
          isUsed: false
        }
      });

      return !!otp;
    } catch (error) {
      console.error('Error checking OTP:', error);
      return false;
    }
  }
}

module.exports = new OTPService();