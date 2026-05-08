const sessionTimeout = (timeoutMinutes = 30) => {
  return (req, res, next) => {
    if (req.session) {
      const now = Date.now();
      const lastActivity = req.session.lastActivity || now;
      const timeout = timeoutMinutes * 60 * 1000;

      if (now - lastActivity > timeout) {
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
        });
        return res.status(401).json({ success: false, error: 'Session expired' });
      }

      req.session.lastActivity = now;
    }
    next();
  };
};

// Activity tracker
const trackActivity = (req, res, next) => {
  if (req.user && req.session) {
    req.session.userId = req.user.id;
    req.session.lastActivity = Date.now();
  }
  next();
};

module.exports = {
  sessionTimeout,
  trackActivity
};