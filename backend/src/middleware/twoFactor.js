const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');

// Generate 2FA secret
const generate2FASecret = async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `CampusHub (${req.user.email})`,
      issuer: 'CampusHub'
    });

    await User.findByIdAndUpdate(req.user.id, {
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.success({
      secret: secret.base32,
      qrCode: qrCodeUrl
    }, '2FA secret generated');
  } catch (error) {
    next(error);
  }
};

// Verify and enable 2FA
const verify2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ success: false, error: 'Invalid 2FA token' });
    }

    await User.findByIdAndUpdate(req.user.id, { twoFactorEnabled: true });
    res.success(null, '2FA enabled successfully');
  } catch (error) {
    next(error);
  }
};

// Middleware to check 2FA
const require2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.twoFactorEnabled && !req.session.twoFactorVerified) {
      return res.status(403).json({ success: false, error: '2FA verification required' });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generate2FASecret,
  verify2FA,
  require2FA
};