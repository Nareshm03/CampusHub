const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
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

// Ensure faculty only access their own subjects (reads and writes).
// ADMIN bypasses; other roles are left to the route's own gates. Reads the
// subject ids from body records ({ subjectId } in attendance[] / marks[])
// as well as subject id route params (:id / :subjectId) and ?subjectId.
// Empty bodies pass through so existing empty-payload behavior is preserved.
const facultySubjectAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Authentication required.'
      });
    }

    if (req.user.role === 'ADMIN' || req.user.role !== 'FACULTY') {
      return next();
    }

    const body = req.body || {};
    const records = Array.isArray(body.attendance)
      ? body.attendance
      : Array.isArray(body.marks)
        ? body.marks
        : [];
    const subjectIds = [...new Set(records.map((r) => r && r.subjectId).filter(Boolean))];

    // Subject-scoped read routes carry the id in params/query instead of
    // body. Only mount this middleware on subject-scoped routes, where
    // :id / :subjectId is always the subject.
    if (req.params) {
      if (req.params.subjectId) subjectIds.push(req.params.subjectId);
      else if (req.params.id) subjectIds.push(req.params.id);
    }
    if (req.query && req.query.subjectId) subjectIds.push(req.query.subjectId);

    if (subjectIds.length === 0) {
      return next();
    }

    const Subject = require('../models/Subject');
    for (const subjectId of subjectIds) {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid subject ID format'
        });
      }
      const owned = await Subject.exists({ _id: subjectId, faculty: req.user._id });
      if (!owned) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only modify your assigned subjects.'
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
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
  facultySubjectAccess,
  blacklistToken
};