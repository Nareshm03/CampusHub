const LoginLog = require('../models/LoginLog');

// @desc    Get all login logs with filtering
// @route   GET /api/v1/login-logs
// @access  Private/Admin
const getLoginLogs = async (req, res, next) => {
  try {
    const { startDate, endDate, status, username, page = 1, limit = 50 } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    if (status) query.status = status;
    if (username) query.username = { $regex: username, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      LoginLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LoginLog.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export login logs to CSV
// @route   GET /api/v1/login-logs/export
// @access  Private/Admin
const exportLoginLogs = async (req, res, next) => {
  try {
    const { startDate, endDate, status, username } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    if (status) query.status = status;
    if (username) query.username = { $regex: username, $options: 'i' };

    const logs = await LoginLog.find(query).sort({ timestamp: -1 }).lean();

    const csvHeader = 'Username,Email,Role,Login Time,IP Address,Device Type,Status,Failure Reason\n';
    const csvRows = logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-');
      
      return `"${log.username}","${log.email}","${log.role}","${timestamp}","${log.ipAddress}","${log.deviceType}","${log.status}","${log.failureReason || ''}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=login-logs-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLoginLogs,
  exportLoginLogs
};
