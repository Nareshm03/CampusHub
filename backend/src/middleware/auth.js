const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getRedis } = require('../config/redis');

// In-memory fallback blacklist (used when Redis is unavailable)
const memoryBlacklist = new Set();

const BLACKLIST_PREFIX = 'bl:';

// Protect routes - verify JWT token
const authenticateToken = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }

  // Check if token is blacklisted (Redis first, fallback to memory)
  const redis = getRedis();
  const isBlacklisted = redis
    ? await redis.exists(`${BLACKLIST_PREFIX}${token}`)
    : memoryBlacklist.has(token);

  if (isBlacklisted) {
    return res.status(401).json({
      success: false,
      error: 'Token has been invalidated'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if account is locked (access removed by admin)
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({
        success: false,
        error: 'Account access has been removed by administrator'
      });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Blacklist token on logout — stores in Redis with TTL matching token expiry
const blacklistToken = async (token) => {
  try {
    const redis = getRedis();
    if (redis) {
      const decoded = jwt.decode(token);
      const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;
      if (ttl > 0) await redis.setEx(`${BLACKLIST_PREFIX}${token}`, ttl, '1');
    } else {
      memoryBlacklist.add(token);
    }
  } catch (err) {
    console.error('Blacklist token error:', err.message);
    memoryBlacklist.add(token);
  }
};

// Admin only access
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
};

// Faculty only access
const facultyOnly = (req, res, next) => {
  if (req.user && req.user.role === 'FACULTY') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Faculty access required'
    });
  }
};

// Admin or Faculty access
const adminOrFaculty = (req, res, next) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'FACULTY')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Admin or Faculty access required'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Authentication required.'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    
    next();
  };
};

// Check resource ownership
const checkOwnership = (req, res, next) => {
  if (req.user.role === 'ADMIN') {
    return next();
  }
  
  if (req.user.role === 'STUDENT' && req.params.id && req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. You can only access your own resources.'
    });
  }
  
  next();
};

// Legacy alias
const protect = authenticateToken;

module.exports = { 
  authenticateToken, 
  protect, 
  adminOnly, 
  facultyOnly, 
  adminOrFaculty, 
  authorize, 
  checkOwnership,
  blacklistToken
};