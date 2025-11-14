// src/controllers/auth/biometricController.js
const tokenService = require('../../services/auth/tokenService');

/**
 * Enable biometric login for this device.
 * Requires authenticated user and a deviceUuid.
 * It marks all active (non-revoked, non-expired) refresh tokens
 * for this user+deviceUuid as biometric-enabled.
 */
exports.enableBiometrics = async (req, res) => {
  try {
    const userId = req.user.id;
    const deviceUuid = req.body.deviceUUID || req.headers['x-device-uuid'] || null;

    if (!deviceUuid) {
      return res.status(400).json({
        success: false,
        error: { message: 'deviceUUID is required', type: 'VALIDATION_ERROR' }
      });
    }

    const updated = await tokenService.setBiometricEnabled(userId, deviceUuid, true);

    return res.status(200).json({
      success: true,
      message: 'Biometric login enabled for this device',
      data: { deviceUUID: deviceUuid, updated }
    });
  } catch (err) {
    console.error('enableBiometrics error:', err);
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Internal Server Error', type: 'SERVER_ERROR' }
    });
  }
};

/**
 * Disable biometric login for this device.
 */
exports.disableBiometrics = async (req, res) => {
  try {
    const userId = req.user.id;
    const deviceUuid = req.body.deviceUUID || req.headers['x-device-uuid'] || null;

    if (!deviceUuid) {
      return res.status(400).json({
        success: false,
        error: { message: 'deviceUUID is required', type: 'VALIDATION_ERROR' }
      });
    }

    const updated = await tokenService.setBiometricEnabled(userId, deviceUuid, false);

    return res.status(200).json({
      success: true,
      message: 'Biometric login disabled for this device',
      data: { deviceUUID: deviceUuid, updated }
    });
  } catch (err) {
    console.error('disableBiometrics error:', err);
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Internal Server Error', type: 'SERVER_ERROR' }
    });
  }
};

/**
 * Optional helper: check if biometric is enabled for this device.
 */
exports.isBiometricEnabledForDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const deviceUuid = req.query.deviceUUID || req.headers['x-device-uuid'] || null;

    if (!deviceUuid) {
      return res.status(400).json({
        success: false,
        error: { message: 'deviceUUID is required', type: 'VALIDATION_ERROR' }
      });
    }

    const enabled = await tokenService.hasActiveBiometricForDevice(userId, deviceUuid);
    return res.status(200).json({
      success: true,
      message: 'Biometric status fetched',
      data: { deviceUUID: deviceUuid, isBiometricEnabled: enabled }
    });
  } catch (err) {
    console.error('isBiometricEnabledForDevice error:', err);
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Internal Server Error', type: 'SERVER_ERROR' }
    });
  }
};
