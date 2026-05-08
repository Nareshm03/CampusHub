const express = require('express');
const { generate2FASecret, verify2FA } = require('../middleware/twoFactor');
const { protect } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

/**
 * @swagger
 * /api/v1/security/2fa/setup:
 *   post:
 *     summary: Generate 2FA secret and QR code
 *     tags: [Security]
 *     responses:
 *       200:
 *         description: 2FA secret generated
 */
router.post('/2fa/setup', protect, auditLogger('2FA_SETUP', 'MEDIUM'), generate2FASecret);

/**
 * @swagger
 * /api/v1/security/2fa/verify:
 *   post:
 *     summary: Verify and enable 2FA
 *     tags: [Security]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 */
router.post('/2fa/verify', protect, auditLogger('2FA_VERIFY', 'MEDIUM'), verify2FA);

module.exports = router;