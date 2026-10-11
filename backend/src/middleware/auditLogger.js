const AuditLogger = require('../utils/auditLogger');
const { redact } = require('../utils/redact');

// Middleware: auto-log any route action after response
const auditLogger = (action, severity = 'LOW') => {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      setImmediate(async () => {
        try {
          await AuditLogger.log({
            userId: req.user?.id,
            action,
            entityType: 'System',
            resource: req.originalUrl,
            // Stored under metadata (a real schema path): bodies may carry
            // passwords, tokens or OTP codes, so they are redacted first.
            metadata: {
              method: req.method,
              requestBody: req.method !== 'GET' ? redact(req.body) : undefined,
              statusCode: res.statusCode
            },
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            severity
          });
        } catch (error) {
          // Audit failure must never break the main flow
        }
      });
      originalSend.call(this, data);
    };

    next();
  };
};

// Security event logger — delegates to AuditLogger utility
const logSecurityEvent = async (event, userId, details, severity = 'HIGH') => {
  await AuditLogger.logAuthAction(`SECURITY_${event}`, userId, {
    req: null,
    status: details.reason ? 'FAILED' : 'SUCCESS',
    role: details.role,
    metadata: details,
    severity
  });
};

module.exports = { auditLogger, logSecurityEvent };