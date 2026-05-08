require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const sessionMiddleware = require('./middleware/session');
const securityMiddleware = require('./middleware/security');
const apiVersioning = require('./middleware/versioning');
const responseFormatter = require('./middleware/responseFormatter');
const { swaggerSetup } = require('./config/swagger');
const { sessionTimeout, trackActivity } = require('./middleware/sessionTimeout');
const { enforceHTTPS, securityHeaders } = require('./middleware/httpsEnforcement');
const { auditLogger } = require('./middleware/auditLogger');
const { initializeSocket } = require('./config/socket');
const { logger, requestLogger } = require('./utils/logger');

// Connect to database
connectDB();

// Connect to Redis (non-blocking)
const { connectRedis } = require('./config/redis');
connectRedis();

// Verify SMTP configuration at startup (non-blocking — logs warning if misconfigured)
const { verifySmtpConnection } = require('./utils/sendEmail');
verifySmtpConnection();

const app = express();

// Request logging middleware
app.use(requestLogger);

// Enhanced CORS configuration - MUST be before other middleware
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'api-version'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle CORS preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
securityMiddleware(app);
app.use(apiLimiter);

// Session management
app.use(sessionMiddleware);

// Security enhancements
app.use(enforceHTTPS);
app.use(securityHeaders);
app.use(sessionTimeout(30)); // 30 minutes timeout
app.use(trackActivity);

// API enhancements
app.use(apiVersioning);
app.use(responseFormatter);


// Serve static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/v1', routes);

// API Documentation
swaggerSetup(app);

// Health check
app.get('/health', (req, res) => {
  res.success({ status: 'OK', uptime: process.uptime() }, 'Server is healthy');
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Initialize Socket.io
const io = initializeSocket(server);
logger.info('Socket.io initialized');

// Graceful shutdown function
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close(false).then(() => {
        logger.info('MongoDB connection closed');
        process.exit(0);
      }).catch((err) => {
        logger.error('Error closing MongoDB connection', err);
        process.exit(1);
      });
    } else {
      process.exit(0);
    }
  });
  
  // Force exit if hanging
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle graceful shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Unhandled Rejection - Error: ${err.message}`, { stack: err.stack });
  shutdown('UNHANDLED_REJECTION');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception - Error: ${err.message}`, { stack: err.stack });
  shutdown('UNCAUGHT_EXCEPTION');
});
