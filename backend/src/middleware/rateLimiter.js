const rateLimit = require('express-rate-limit');
const { getRedis, isRedisConnected } = require('../config/redis');

const getStore = () => {
  const client = getRedis();
  if (client && isRedisConnected()) {
    try {
      const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
      return new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
      });
    } catch (e) {
      // Missing package or fail, fallback to memory
      return undefined;
    }
  }
  return undefined; // Memory fallback
};
// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  store: getStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // Higher limit in development
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for general API endpoints
const apiLimiter = rateLimit({
  store: getStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit in development
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for password reset
const passwordResetLimiter = rateLimit({
  store: getStore(),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: 'Too many password reset attempts, please try again later.'
  },
});

// Rate limiter for file uploads
const uploadLimiter = rateLimit({
  store: getStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 uploads per 15 minutes
  message: {
    success: false,
    error: 'Too many upload attempts, please try again later.'
  },
});

// Rate limiter for discussion/forum posts to prevent spam
const discussionLimiter = rateLimit({
  store: getStore(),
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 10,
  message: { success: false, error: 'Too many posts, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  apiLimiter,
  passwordResetLimiter,
  uploadLimiter,
  discussionLimiter
};