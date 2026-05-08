const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');
const { AuditLog } = require('../models/AuditLog');

// Enhanced rate limiting
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ success: false, error: message });
  }
});

// Account lockout tracking
const loginAttempts = new Map();

// Enhanced protect middleware with audit logging
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    await logSecurityEvent(req, 'UNAUTHORIZED_ACCESS_ATTEMPT');
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      await logSecurityEvent(req, 'INVALID_TOKEN_USER_NOT_FOUND');
      return res.status(401).json({
        success: false,
        error: 'Token is not valid'
      });
    }

    // Check if user account is locked
    if (user.accountLocked && user.lockUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        error: 'Account temporarily locked due to too many failed attempts'
      });
    }

    req.user = user;
    req.auditData = {
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    next();
  } catch (error) {
    await logSecurityEvent(req, 'INVALID_TOKEN', { error: error.message });
    return res.status(401).json({
      success: false,
      error: 'Token is not valid'
    });
  }
};

// Enhanced role-based access control
const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Please login.'
      });
    }

    if (!roles.includes(req.user.role)) {
      await logSecurityEvent(req, 'UNAUTHORIZED_ROLE_ACCESS', {
        userRole: req.user.role,
        requiredRoles: roles
      });
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Account lockout mechanism
const handleFailedLogin = async (email, ip) => {
  const key = `${email}:${ip}`;
  const attempts = loginAttempts.get(key) || { count: 0, lastAttempt: Date.now() };
  
  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(key, attempts);
  
  if (attempts.count >= parseInt(process.env.MAX_LOGIN_ATTEMPTS || 5)) {
    const user = await User.findOne({ email });
    if (user) {
      user.accountLocked = true;
      user.lockUntil = Date.now() + (parseInt(process.env.LOCKOUT_TIME || 30) * 60 * 1000);
      await user.save();
    }
    
    await logSecurityEvent({ ip }, 'ACCOUNT_LOCKED', { email, attempts: attempts.count });
  }
};

// Clear login attempts on successful login
const clearFailedLogin = (email, ip) => {
  const key = `${email}:${ip}`;
  loginAttempts.delete(key);
};

// Security event logging
const logSecurityEvent = async (req, event, data = {}) => {
  try {
    await AuditLog.create({
      userId: req.user?._id || null,
      action: event,
      resource: 'SECURITY',
      resourceId: null,
      newData: {
        event,
        ...data,
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/[<>\"'&]/g, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

module.exports = {
  protect,
  authorize,
  adminOnly: authorize('ADMIN'),
  facultyOnly: authorize('FACULTY'),
  adminOrFaculty: authorize('ADMIN', 'FACULTY'),
  handleFailedLogin,
  clearFailedLogin,
  logSecurityEvent,
  sanitizeInput,
  createRateLimiter
};