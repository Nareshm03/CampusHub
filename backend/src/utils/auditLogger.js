const AuditLog = require('../models/AuditLog');

/**
 * Enterprise-grade Audit Logging Utility
 * Provides reusable functions for logging all system actions
 */

class AuditLogger {
  /**
   * Core logging function
   * @param {Object} logData - Audit log data
   * @returns {Promise<AuditLog>} Created audit log
   */
  static async log(logData) {
    try {
      const auditLog = new AuditLog(logData);
      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging failure shouldn't break the main operation
      return null;
    }
  }

  /**
   * Helper to extract IP and User Agent from request
   */
  static getRequestMetadata(req) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      sessionId: req.sessionID || req.headers['x-session-id']
    };
  }

  /**
   * Log marks-related actions
   */
  static async logMarksAction(action, performedBy, data) {
    const {
      entityId,
      affectedUser,
      subject,
      changes = {},
      metadata = {},
      req = null,
      status = 'SUCCESS',
      error = null
    } = data;

    const severity = this.getSeverityForAction(action);
    const requestMeta = req ? this.getRequestMetadata(req) : {};

    return await this.log({
      action,
      entityType: 'Marks',
      entityId,
      performedBy: performedBy._id || performedBy,
      performedByRole: performedBy.role,
      affectedUser,
      relatedEntities: {
        subject: subject?._id || subject
      },
      changes,
      metadata: {
        ...requestMeta,
        ...metadata
      },
      status,
      severity,
      error: error ? { message: error.message, code: error.code } : undefined
    });
  }

  /**
   * Log attendance-related actions
   */
  static async logAttendanceAction(action, performedBy, data) {
    const {
      entityId,
      affectedUser,
      subject,
      changes = {},
      metadata = {},
      req = null,
      status = 'SUCCESS',
      error = null
    } = data;

    const severity = this.getSeverityForAction(action);
    const requestMeta = req ? this.getRequestMetadata(req) : {};

    return await this.log({
      action,
      entityType: 'Attendance',
      entityId,
      performedBy: performedBy._id || performedBy,
      performedByRole: performedBy.role,
      affectedUser,
      relatedEntities: {
        subject: subject?._id || subject
      },
      changes,
      metadata: {
        ...requestMeta,
        ...metadata
      },
      status,
      severity,
      error: error ? { message: error.message, code: error.code } : undefined
    });
  }

  /**
   * Log homework-related actions
   */
  static async logHomeworkAction(action, performedBy, data) {
    const {
      entityId,
      affectedUser,
      subject,
      changes = {},
      metadata = {},
      req = null,
      status = 'SUCCESS',
      error = null
    } = data;

    const severity = this.getSeverityForAction(action);
    const requestMeta = req ? this.getRequestMetadata(req) : {};

    return await this.log({
      action,
      entityType: action.includes('SUBMISSION') ? 'Submission' : 'Homework',
      entityId,
      performedBy: performedBy._id || performedBy,
      performedByRole: performedBy.role,
      affectedUser,
      relatedEntities: {
        subject: subject?._id || subject
      },
      changes,
      metadata: {
        ...requestMeta,
        ...metadata
      },
      status,
      severity,
      error: error ? { message: error.message, code: error.code } : undefined
    });
  }

  /**
   * Log placement-related actions
   */
  static async logPlacementAction(action, performedBy, data) {
    const {
      entityId,
      affectedUser,
      changes = {},
      metadata = {},
      req = null,
      status = 'SUCCESS',
      error = null
    } = data;

    const severity = this.getSeverityForAction(action);
    const requestMeta = req ? this.getRequestMetadata(req) : {};

    return await this.log({
      action,
      entityType: 'Placement',
      entityId,
      performedBy: performedBy._id || performedBy,
      performedByRole: performedBy.role,
      affectedUser,
      changes,
      metadata: {
        ...requestMeta,
        ...metadata
      },
      status,
      severity,
      error: error ? { message: error.message, code: error.code } : undefined
    });
  }

  /**
   * Log user authentication actions
   */
  static async logAuthAction(action, userId, data) {
    const {
      req = null,
      status = 'SUCCESS',
      error = null
    } = data;

    const requestMeta = req ? this.getRequestMetadata(req) : {};

    return await this.log({
      action,
      entityType: 'User',
      entityId: userId || undefined,
      performedBy: userId || undefined,
      performedByRole: data.role || 'STUDENT',
      metadata: {
        ...requestMeta,
        ...data.metadata
      },
      status,
      severity: status === 'FAILED' ? 'MEDIUM' : 'LOW',
      error: error ? { message: error.message, code: error.code } : undefined
    });
  }

  /**
   * Log bulk operations
   */
  static async logBulkOperation(action, performedBy, data) {
    const {
      entityType,
      affectedCount,
      subject,
      changes = {},
      metadata = {},
      req = null,
      status = 'SUCCESS',
      error = null
    } = data;

    const requestMeta = req ? this.getRequestMetadata(req) : {};
    const severity = affectedCount > 100 ? 'HIGH' : affectedCount > 50 ? 'MEDIUM' : 'LOW';

    return await this.log({
      action,
      entityType,
      performedBy: performedBy._id || performedBy,
      performedByRole: performedBy.role,
      relatedEntities: {
        subject: subject?._id || subject
      },
      changes,
      metadata: {
        ...requestMeta,
        affectedCount,
        batchSize: affectedCount,
        ...metadata
      },
      status,
      severity,
      error: error ? { message: error.message, code: error.code } : undefined
    });
  }

  /**
   * Determine severity based on action type
   */
  static getSeverityForAction(action) {
    const criticalActions = ['MARKS_DELETED', 'ATTENDANCE_DELETED', 'USER_DELETED'];
    const highActions = ['MARKS_BULK_UPDATE', 'ATTENDANCE_BULK_MARK', 'PLACEMENT_OFFER_MADE'];
    const mediumActions = ['MARKS_UPDATED', 'ATTENDANCE_UPDATED', 'HOMEWORK_GRADED'];
    
    if (criticalActions.includes(action)) return 'CRITICAL';
    if (highActions.includes(action)) return 'HIGH';
    if (mediumActions.includes(action)) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Query audit logs with filters
   */
  static async query(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = -1,
      populate = true
    } = options;

    const skip = (page - 1) * limit;

    let query = AuditLog.find(filters)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    if (populate) {
      query = query
        .populate('performedBy', 'name email role')
        .populate('affectedUser', 'name email rollNumber')
        .populate('relatedEntities.subject', 'name code');
    }

    const [logs, total] = await Promise.all([
      query.exec(),
      AuditLog.countDocuments(filters)
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    };
  }

  /**
   * Get recent activity for a user
   */
  static async getUserActivity(userId, limit = 20) {
    return await AuditLog.find({
      $or: [
        { performedBy: userId },
        { affectedUser: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('performedBy', 'name role')
    .populate('affectedUser', 'name rollNumber')
    .populate('relatedEntities.subject', 'name code');
  }

  /**
   * Get activity summary/statistics
   */
  static async getStatistics(filters = {}, dateRange = null) {
    let matchFilter = { ...filters };

    if (dateRange) {
      matchFilter.createdAt = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }

    const stats = await AuditLog.aggregate([
      { $match: matchFilter },
      {
        $facet: {
          byAction: [
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          bySeverity: [
            { $group: { _id: '$severity', count: { $sum: 1 } } }
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byEntityType: [
            { $group: { _id: '$entityType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          totalCount: [
            { $count: 'total' }
          ],
          recentFailures: [
            { $match: { status: 'FAILED' } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'users',
                localField: 'performedBy',
                foreignField: '_id',
                as: 'user'
              }
            },
            { $unwind: '$user' },
            {
              $project: {
                action: 1,
                'error.message': 1,
                createdAt: 1,
                'user.name': 1,
                'user.role': 1
              }
            }
          ]
        }
      }
    ]);

    return stats[0];
  }

  /**
   * Flag suspicious activity for review
   */
  static async flagSuspicious(logId, reason) {
    return await AuditLog.findByIdAndUpdate(
      logId,
      {
        'flags.suspicious': true,
        'flags.requiresReview': true,
        'metadata.reason': reason
      },
      { new: true }
    );
  }

  /**
   * Mark log as reviewed
   */
  static async markReviewed(logId, reviewedBy) {
    return await AuditLog.findByIdAndUpdate(
      logId,
      {
        'flags.reviewed': true,
        'flags.reviewedBy': reviewedBy,
        'flags.reviewedAt': new Date()
      },
      { new: true }
    );
  }
}

module.exports = AuditLogger;
