const AuditLog = require('../models/AuditLog');
const AuditLogger = require('../utils/auditLogger');

/**
 * @desc    Get audit logs with filters and pagination
 * @route   GET /api/audit-logs
 * @access  Private/Faculty/Admin
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      action,
      entityType,
      performedBy,
      affectedUser,
      severity,
      status,
      startDate,
      endDate,
      subject,
      suspicious,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filters = {};

    if (action) filters.action = action;
    if (entityType) filters.entityType = entityType;
    if (performedBy) filters.performedBy = performedBy;
    if (affectedUser) filters.affectedUser = affectedUser;
    if (severity) filters.severity = severity;
    if (status) filters.status = status;
    if (subject) filters['relatedEntities.subject'] = subject;
    if (suspicious === 'true') filters['flags.suspicious'] = true;

    // Date range filter
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Faculty can only see logs related to their actions or subjects
    if (req.user.role === 'faculty') {
      filters.$or = [
        { performedBy: req.user._id },
        { 'relatedEntities.subject': { $in: req.user.subjects || [] } }
      ];
    }

    const result = await AuditLogger.query(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1,
      populate: true
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
};

/**
 * @desc    Get audit log by ID
 * @route   GET /api/audit-logs/:id
 * @access  Private/Faculty/Admin
 */
exports.getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findById(id)
      .populate('performedBy', 'name email role')
      .populate('affectedUser', 'name email rollNumber')
      .populate('relatedEntities.subject', 'name code semester')
      .populate('relatedEntities.department', 'name')
      .populate('flags.reviewedBy', 'name role');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    // Faculty can only view logs they're authorized to see
    if (req.user.role === 'faculty') {
      const isAuthorized = 
        log.performedBy._id.toString() === req.user._id.toString() ||
        (log.relatedEntities.subject && 
         req.user.subjects?.includes(log.relatedEntities.subject._id.toString()));
      
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this log'
        });
      }
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit log',
      error: error.message
    });
  }
};

/**
 * @desc    Get audit statistics
 * @route   GET /api/audit-logs/statistics
 * @access  Private/Admin
 */
exports.getStatistics = async (req, res) => {
  try {
    const { startDate, endDate, entityType, action } = req.query;

    const filters = {};
    if (entityType) filters.entityType = entityType;
    if (action) filters.action = action;

    const dateRange = startDate && endDate ? { start: startDate, end: endDate } : null;

    const stats = await AuditLogger.getStatistics(filters, dateRange);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get user activity timeline
 * @route   GET /api/audit-logs/user/:userId
 * @access  Private/Faculty/Admin
 */
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    // Faculty can only view their own activity or students' activity
    if (req.user.role === 'faculty' && userId !== req.user._id.toString()) {
      // Check if the requested user is a student (would need additional validation)
      const requestedUser = await require('../models/User').findById(userId);
      if (!requestedUser || requestedUser.role === 'faculty' || requestedUser.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this user\'s activity'
        });
      }
    }

    const activity = await AuditLogger.getUserActivity(userId, parseInt(limit));

    res.json({
      success: true,
      count: activity.length,
      data: activity
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity',
      error: error.message
    });
  }
};

/**
 * @desc    Get recent activity (last 24 hours)
 * @route   GET /api/audit-logs/recent
 * @access  Private/Admin
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const { limit = 100, severity, action } = req.query;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const filters = {
      createdAt: { $gte: yesterday }
    };

    if (severity) filters.severity = severity;
    if (action) filters.action = action;

    const result = await AuditLogger.query(filters, {
      page: 1,
      limit: parseInt(limit),
      sortBy: 'createdAt',
      sortOrder: -1,
      populate: true
    });

    res.json({
      success: true,
      count: result.logs.length,
      data: result.logs
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activity',
      error: error.message
    });
  }
};

/**
 * @desc    Get suspicious activities requiring review
 * @route   GET /api/audit-logs/suspicious
 * @access  Private/Admin
 */
exports.getSuspiciousActivities = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const logs = await AuditLog.find({
      'flags.suspicious': true,
      'flags.reviewed': false
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .populate('performedBy', 'name email role')
    .populate('affectedUser', 'name email rollNumber')
    .populate('relatedEntities.subject', 'name code');

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Get suspicious activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suspicious activities',
      error: error.message
    });
  }
};

/**
 * @desc    Flag log as suspicious
 * @route   PATCH /api/audit-logs/:id/flag
 * @access  Private/Admin
 */
exports.flagSuspicious = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const log = await AuditLogger.flagSuspicious(id, reason);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    res.json({
      success: true,
      message: 'Log flagged as suspicious',
      data: log
    });
  } catch (error) {
    console.error('Flag suspicious error:', error);
    res.status(500).json({
      success: false,
      message: 'Error flagging log',
      error: error.message
    });
  }
};

/**
 * @desc    Mark log as reviewed
 * @route   PATCH /api/audit-logs/:id/review
 * @access  Private/Admin
 */
exports.markReviewed = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLogger.markReviewed(id, req.user._id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    res.json({
      success: true,
      message: 'Log marked as reviewed',
      data: log
    });
  } catch (error) {
    console.error('Mark reviewed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking log as reviewed',
      error: error.message
    });
  }
};

/**
 * @desc    Export audit logs
 * @route   GET /api/audit-logs/export
 * @access  Private/Admin
 */
exports.exportLogs = async (req, res) => {
  try {
    const {
      format = 'json',
      startDate,
      endDate,
      action,
      entityType
    } = req.query;

    const filters = {};
    if (action) filters.action = action;
    if (entityType) filters.entityType = entityType;
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(filters)
      .sort({ createdAt: -1 })
      .populate('performedBy', 'name email role')
      .populate('affectedUser', 'name email rollNumber')
      .populate('relatedEntities.subject', 'name code')
      .lean();

    if (format === 'csv') {
      // Convert to CSV
      const csvHeader = 'Timestamp,Action,Entity Type,Performed By,Affected User,Subject,Status,Severity\n';
      const csvRows = logs.map(log => {
        return [
          new Date(log.createdAt).toISOString(),
          log.action,
          log.entityType,
          log.performedBy?.name || 'N/A',
          log.affectedUser?.name || 'N/A',
          log.relatedEntities?.subject?.name || 'N/A',
          log.status,
          log.severity
        ].join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
      res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        count: logs.length,
        data: logs
      });
    }
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting logs',
      error: error.message
    });
  }
};

/**
 * @desc    Get marks-related audit logs
 * @route   GET /api/audit-logs/marks
 * @access  Private/Faculty/Admin
 */
exports.getMarksAuditLogs = async (req, res) => {
  try {
    const { subject, student, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filters = {
      entityType: 'Marks'
    };

    if (subject) filters['relatedEntities.subject'] = subject;
    if (student) filters.affectedUser = student;
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Faculty can only see their own marks logs
    if (req.user.role === 'faculty') {
      filters.performedBy = req.user._id;
    }

    const result = await AuditLogger.query(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: 'createdAt',
      sortOrder: -1,
      populate: true
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get marks audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching marks audit logs',
      error: error.message
    });
  }
};

/**
 * @desc    Get attendance-related audit logs
 * @route   GET /api/audit-logs/attendance
 * @access  Private/Faculty/Admin
 */
exports.getAttendanceAuditLogs = async (req, res) => {
  try {
    const { subject, student, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filters = {
      entityType: 'Attendance'
    };

    if (subject) filters['relatedEntities.subject'] = subject;
    if (student) filters.affectedUser = student;
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Faculty can only see their own attendance logs
    if (req.user.role === 'faculty') {
      filters.performedBy = req.user._id;
    }

    const result = await AuditLogger.query(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: 'createdAt',
      sortOrder: -1,
      populate: true
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get attendance audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance audit logs',
      error: error.message
    });
  }
};
