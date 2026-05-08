const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// Enhanced security middleware
const securityMiddleware = (app) => {
  // Prevent NoSQL injection attacks
  app.use(mongoSanitize());
  
  // Prevent HTTP Parameter Pollution
  app.use(hpp());
  
  // Input sanitization
  app.use((req, res, next) => {
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }
    next();
  });
  
  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
};

module.exports = securityMiddleware;