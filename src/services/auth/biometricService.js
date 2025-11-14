const crypto = require('crypto');
const { User } = require('../../models/user/User');
const tokenService = require('./tokenService');
const { AppError } = require('../../middleware/errorValidation/errorHandler');

class BiometricService {
  /**
   * Register biometric public key for user
   */
  async registerBiometric(userId, publicKey, deviceInfo = {}) {
    try {
      console.log(`Registering biometric for user: ${userId}`);
      
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Validate public key format (basic validation)
      if (!publicKey || typeof publicKey !== 'string' || publicKey.length < 50) {
        throw new AppError('Invalid public key format', 400, 'INVALID_PUBLIC_KEY');
      }

      // Check if biometric is already registered
      if (user.biometric_public_key) {
        throw new AppError('Biometric already registered', 400, 'BIOMETRIC_ALREADY_REGISTERED');
      }

      // Update user with biometric public key
      await user.update({
        biometric_public_key: publicKey,
        biometric_enabled: true,
        last_biometric_used: new Date()
      });

      console.log(`Biometric registered successfully for user: ${userId}`);
      
      return {
        success: true,
        message: 'Biometric authentication registered successfully',
        biometricEnabled: true
      };
    } catch (error) {
      console.error('Biometric registration error:', error);
      throw error;
    }
  }

  /**
   * Generate challenge for biometric verification
   */
  async generateChallenge(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.biometric_enabled) {
        throw new AppError('Biometric not enabled for user', 400, 'BIOMETRIC_NOT_ENABLED');
      }

      // Generate random challenge
      const challenge = crypto.randomBytes(32).toString('base64');
      
      // Store challenge temporarily (in production, use Redis with expiry)
      const challengeId = crypto.randomBytes(16).toString('hex');
      const challengeData = {
        userId,
        challenge,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      };

      // In production, store in Redis: await redis.set(`biometric:${challengeId}`, JSON.stringify(challengeData), 'EX', 300);
      // For now, we'll return it directly (frontend should send it back)
      
      return {
        challengeId,
        challenge,
        expiresIn: 300 // 5 minutes in seconds
      };
    } catch (error) {
      console.error('Challenge generation error:', error);
      throw error;
    }
  }

  /**
   * Verify biometric signature and issue tokens
   */
  async verifyBiometric(userId, challenge, signature, deviceInfo = {}, ipAddress = null) {
    try {
      console.log(`Verifying biometric for user: ${userId}`);
      
      const user = await User.findByPk(userId);
      if (!user || !user.biometric_public_key) {
        throw new AppError('Biometric not registered', 400, 'BIOMETRIC_NOT_REGISTERED');
      }

      // In production, verify the challenge was issued to this user
      // const storedChallenge = await redis.get(`biometric:${challengeId}`);
      // if (!storedChallenge || storedChallenge.userId !== userId) {
      //   throw new AppError('Invalid challenge', 400, 'INVALID_CHALLENGE');
      // }

      // Verify the signature using the public key
      const isValid = await this.verifySignature(
        challenge, 
        signature, 
        user.biometric_public_key
      );

      if (!isValid) {
        throw new AppError('Invalid biometric signature', 401, 'INVALID_SIGNATURE');
      }

      // Update last used timestamp
      await user.update({
        last_biometric_used: new Date()
      });

      // Generate tokens
      const tokens = await tokenService.generateTokens(user, deviceInfo, ipAddress);

      console.log(`Biometric verification successful for user: ${userId}`);
      
      return {
        success: true,
        message: 'Biometric authentication successful',
        tokens,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          biometricEnabled: user.biometric_enabled
        }
      };
    } catch (error) {
      console.error('Biometric verification error:', error);
      throw error;
    }
  }

  /**
   * Verify cryptographic signature (simplified - implement proper crypto verification)
   */
  async verifySignature(challenge, signature, publicKey) {
    try {
      // In a real implementation, you would use proper cryptographic verification
      // This is a simplified version - implement based on your crypto library
      
      // For production, use a proper crypto library like:
      // const crypto = require('crypto');
      // const verify = crypto.createVerify('SHA256');
      // verify.update(challenge);
      // verify.end();
      // return verify.verify(publicKey, signature, 'base64');
      
      // For now, return true if signature exists (implement proper verification)
      return !!signature && signature.length > 10;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Remove biometric registration
   */
  async removeBiometric(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      await user.update({
        biometric_public_key: null,
        biometric_enabled: false,
        last_biometric_used: null
      });

      return {
        success: true,
        message: 'Biometric authentication removed successfully'
      };
    } catch (error) {
      console.error('Biometric removal error:', error);
      throw error;
    }
  }

  /**
   * Check if user has biometric enabled
   */
  async getBiometricStatus(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['id', 'biometric_enabled', 'last_biometric_used']
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      return {
        biometricEnabled: user.biometric_enabled,
        lastUsed: user.last_biometric_used
      };
    } catch (error) {
      console.error('Biometric status check error:', error);
      throw error;
    }
  }
}

module.exports = new BiometricService();