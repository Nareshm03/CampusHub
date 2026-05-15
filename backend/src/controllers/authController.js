const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
const { passwordResetTemplate, emailVerificationTemplate } = require('../utils/authEmailTemplates');
const crypto = require('crypto');
const { logSecurityEvent } = require('../middleware/auditLogger');
const speakeasy = require('speakeasy');

// Frontend base URL — used to build links that open in the browser, not the API
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    const user = await User.create({
      name,
      email,
      password,
      role,
      department
    });

    // Generate email verification token
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Points to the Next.js verify-email page, not the raw API endpoint
    const verificationUrl = `${FRONTEND_URL}/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: `${process.env.FROM_NAME || 'CampusHub'} – Verify Your Email`,
        html: emailVerificationTemplate({ name: user.name, verifyUrl: verificationUrl })
      });
    } catch (err) {
      // Non-fatal: user is registered, they can request re-verification later
      console.error('Email verification send failed:', err.message);
    }

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user with 2FA support
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password, twoFactorToken } = req.body;

    if (!email || !password) {
      await logSecurityEvent('LOGIN_FAILED', null, { email, reason: 'Missing credentials' });
      return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      await logSecurityEvent('LOGIN_FAILED', null, { email, reason: 'User not found' });
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      await logSecurityEvent('LOGIN_FAILED', user._id, { reason: 'Invalid password' });
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        return res.status(403).json({ success: false, error: '2FA token required' });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 2
      });

      if (!verified) {
        await logSecurityEvent('2FA_FAILED', user._id, { token: twoFactorToken });
        return res.status(401).json({ success: false, error: 'Invalid 2FA token' });
      }

      req.session.twoFactorVerified = true;
    }

    await logSecurityEvent('LOGIN_SUCCESS', user._id, { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      role: user.role 
    });
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'There is no user with that email'
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Points to the Next.js reset-password page, not the raw API endpoint
    const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: `${process.env.FROM_NAME || 'CampusHub'} – Reset Your Password`,
        html: passwordResetTemplate({ name: user.name, resetUrl })
      });

      res.status(200).json({ success: true, data: 'Password reset email sent' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('Password reset email failed:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message.includes('placeholder') || err.message.includes('not configured')
          ? 'Email service is not configured. Contact your administrator.'
          : 'Email could not be sent. Please try again later.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   GET /api/auth/verifyemail/:token
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const emailVerificationToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, data: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Change own password (requires current password)
// @route   PUT /api/auth/changepassword
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Please provide current and new password' });
    }

    // Enhanced password validation
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }

    // Check for lowercase and numeric
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ success: false, error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, error: 'Password must contain at least one number' });
    }

    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      await logSecurityEvent('PASSWORD_CHANGE_FAILED', user._id, { 
        reason: 'Incorrect current password',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await logSecurityEvent('PASSWORD_CHANGED', user._id, { 
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      role: user.role,
      changedBy: 'self'
    });

    res.status(200).json({ success: true, data: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   GET /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const { blacklistToken } = require('../middleware/auth');
    if (req.token) await blacklistToken(req.token);

    await logSecurityEvent('LOGOUT', req.user?.id, { ip: req.ip });

    req.session.destroy((err) => {
      if (err) console.error('Session destroy error:', err);
    });

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    res.success(null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  changePassword,
  logout
};