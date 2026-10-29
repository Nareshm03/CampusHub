const User = require('../models/User');
const Student = require('../models/Student');
const Department = require('../models/Department');
const mongoose = require('mongoose');
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
    const { name, email, password, role, department, usn, semester } = req.body;

    // Public self-registration must never create privileged accounts.
    // Staff (FACULTY/ADMIN) accounts are created by an administrator.
    const SELF_REGISTER_ROLES = ['STUDENT', 'PARENT'];
    if (!SELF_REGISTER_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Self-registration is only available for STUDENT or PARENT accounts. Staff accounts are created by an administrator.'
      });
    }

    // Email must be unique — return a clean 400 instead of a 500 from the
    // unique-index error.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Resolve department: accept a raw ObjectId string or a department name.
    let departmentId = null;
    if (department) {
      if (mongoose.Types.ObjectId.isValid(department)) {
        departmentId = department;
      } else {
        const dept = await Department.findOne({
          name: new RegExp(`^${department.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
        });
        if (dept) departmentId = dept._id;
      }
    }

    // Student-specific validation and profile creation.
    // USN/semester are optional in the request: when provided for a STUDENT
    // registration, a linked Student profile is created immediately; when
    // omitted, the User account is created alone and the profile can be
    // completed later (e.g. by an admin). This keeps the public endpoint
    // backward-compatible with callers that only supply name/email/password.
    let studentCreated = false;
    if (role === 'STUDENT' && usn && semester) {
      if (!departmentId) {
        return res.status(400).json({
          success: false,
          error: 'Department is required for student registration.'
        });
      }
      const upperUsn = String(usn).trim().toUpperCase();
      const existingStudent = await Student.findOne({ usn: upperUsn });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          error: 'USN already registered'
        });
      }
      studentCreated = true;
    }

    // Create the user account. Password is hashed by the User pre('save') hook.
    const user = await User.create({
      name,
      email,
      password,
      role,
      department: departmentId
    });

    // Create the linked Student profile for self-registered students.
    // Compensate (delete the user) if the profile write fails so no orphan
    // account is left behind.
    if (studentCreated) {
      try {
        await Student.create({
          userId: user._id,
          usn: String(usn).trim().toUpperCase(),
          department: departmentId,
          semester: parseInt(semester, 10)
        });
      } catch (profileError) {
        await User.findByIdAndDelete(user._id);
        next(profileError);
        return;
      }
    }

    // Generate email verification token and persist it
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Points to the Next.js verify-email page, not the raw API endpoint
    const verificationUrl = `${FRONTEND_URL}/verify-email/${verificationToken}`;

    let emailSent = false;
    try {
      await sendEmail({
        email: user.email,
        subject: `${process.env.FROM_NAME || 'CampusHub'} – Verify Your Email`,
        html: emailVerificationTemplate({ name: user.name, verifyUrl: verificationUrl })
      });
      emailSent = true;
    } catch (err) {
      // Do not expose SMTP details. Account is created but unverified;
      // a resend endpoint is available for recovery.
      console.error('Email verification send failed:', err.message);
    }

    // Never issue an access token to an unverified account. The backend
    // verification gate (authenticateToken) blocks all protected access
    // until isEmailVerified is true, so a token here would be useless
    // and misleading.
    return res.status(201).json({
      success: true,
      verified: false,
      emailSent,
      message: emailSent
        ? 'Account created. Please check your email to verify your account before signing in.'
        : 'Account created. Verification email could not be sent. You can request a new verification email from the login page.'
    });
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
        // Never log the OTP value itself — record the failure only.
        await logSecurityEvent('2FA_FAILED', user._id, { reason: 'Invalid 2FA token' });
        return res.status(401).json({ success: false, error: 'Invalid 2FA token' });
      }

      req.session.twoFactorVerified = true;
    }

    // Block login for unverified self-registered accounts. A valid JWT
    // would be useless anyway (authenticateToken blocks unverified users),
    // but we reject early with a clear message and a resend path.
    if (!user.isEmailVerified) {
      await logSecurityEvent('SECURITY_LOGIN_FAILED', user._id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        role: user.role,
        reason: 'Email not verified'
      });
      return res.status(403).json({
        success: false,
        error: 'Email verification required. Please verify your email before signing in, or request a new verification email.'
      });
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

// @desc    Get current logged in user (authoritative profile for AuthContext)
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpire -twoFactorSecret')
      .populate('department', 'name')
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Student-profile fields consumed by role-specific UI (semester display,
    // USN badge, navbar photo). Sourced here so AuthContext stays the single
    // consumer-facing source; no extra frontend calls needed.
    let studentExtras = {};
    if (user.role === 'STUDENT') {
      const profile = await Student.findOne({ userId: user._id }).select('usn semester profilePhoto').lean();
      if (profile) {
        studentExtras = {
          usn: profile.usn,
          semester: profile.semester,
          profilePhoto: profile.profilePhoto || undefined
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...user,
        id: user._id,
        ...studentExtras
      }
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

// @desc    Resend email verification link
// @route   POST /api/auth/resend-verification
// @access  Public
// Never reveals whether an account exists for the given email.
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });

    if (user && !user.isEmailVerified) {
      const verificationToken = user.getEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      const verificationUrl = `${FRONTEND_URL}/verify-email/${verificationToken}`;
      try {
        await sendEmail({
          email: user.email,
          subject: `${process.env.FROM_NAME || 'CampusHub'} – Verify Your Email`,
          html: emailVerificationTemplate({ name: user.name, verifyUrl: verificationUrl })
        });
      } catch (err) {
        // Do not expose SMTP details. Token is saved so a subsequent
        // resend attempt will regenerate and retry.
        console.error('Verification resend send failed:', err.message);
      }
    }

    // Always return the same message to avoid revealing account existence.
    return res.status(200).json({
      success: true,
      message: 'If an unverified account exists for this email, a verification link has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  logout
};