// src/routes/auth/biometricRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth/auth');
const biometricController = require('../../controllers/auth/biometricController');

/**
 * @swagger
 * /auth/enable-biometrics:
 *   patch:
 *     summary: Enable biometric login for this device
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceUUID:
 *                 type: string
 *                 example: "ios-ABC123-unique"
 *     responses:
 *       200:
 *         description: Biometric enabled
 */
router.patch('/enable-biometrics', authenticate, biometricController.enableBiometrics);

/**
 * @swagger
 * /auth/disable-biometrics:
 *   patch:
 *     summary: Disable biometric login for this device
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceUUID:
 *                 type: string
 *     responses:
 *       200:
 *         description: Biometric disabled
 */
router.patch('/disable-biometrics', authenticate, biometricController.disableBiometrics);

/**
 * @swagger
 * /auth/biometrics-status:
 *   get:
 *     summary: Check biometric enabled status for this device
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: deviceUUID
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Biometric status
 */
router.get('/biometrics-status', authenticate, biometricController.isBiometricEnabledForDevice);

module.exports = router;
