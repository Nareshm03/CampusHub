const mongoose = require('mongoose');

/**
 * Enterprise-grade Audit Log Schema
 * Tracks all critical actions for compliance and security
 */
const auditLogSchema = new mongoose.Schema({
  // Action Details
  action: {
    type: String,
    required: true,
    enum: [
      // Marks Actions
      'MARKS_CREATED',
      'MARKS_UPDATED',
      'MARKS_DELETED',
      'MARKS_BULK_UPDATE',
      
      // Attendance Actions
      'ATTENDANCE_MARKED',
      'ATTENDANCE_UPDATED',
      'ATTENDANCE_DELETED',
      'ATTENDANCE_BULK_MARK',
      
      // Homework Actions
      'HOMEWORK_CREATED',
      'HOMEWORK_UPDATED',
      'HOMEWORK_DELETED',
      'HOMEWORK_GRADED',
      'SUBMISSION_GRADED',
      'SUBMISSION_PLAGIARISM_CHECK',
      
      // Placement Actions
      'PLACEMENT_STATUS_CHANGED',
      'PLACEMENT_APPLICATION_CREATED',
      'PLACEMENT_APPLICATION_UPDATED',
      'PLACEMENT_INTERVIEW_SCHEDULED',
      'PLACEMENT_OFFER_MADE',
      
      // User Actions
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DELETED',
      'SECURITY_LOGIN_SUCCESS',
      'SECURITY_LOGIN_FAILED',
      
      // System Actions
      'SETTINGS_CHANGED',
      'REPORT_GENERATED',
      'DATA_EXPORTED',
      'BACKUP_CREATED'
    ],
    index: true
  },

  // Entity Information
  entityType: {
    type: String,
    required: true,
    enum: ['Marks', 'Attendance', 'Homework', 'Submission', 'Placement', 'User', 'Application', 'System'],
    index: true
  },

  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },

  // User who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },

  performedByRole: {
    type: String,
    enum: ['STUDENT', 'FACULTY', 'ADMIN', 'PARENT', 'SYSTEM'],
    required: false,
    index: true
  },

  // Affected user (for student-specific actions)
  affectedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Related entities for context
  relatedEntities: {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    semester: Number,
    course: String
  },

  // Changes tracking (before/after state)
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },

  // Additional metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    
    // Action-specific metadata
    batchSize: Number,
    affectedCount: Number,
    duration: Number,
    
    reason: String,
    notes: String
  },

  // Status and flags
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'SUCCESS'
  },

  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
    index: true
  },

  // Error information
  error: {
    message: String,
    code: String
  },

  // Compliance flags
  flags: {
    requiresReview: {
      type: Boolean,
      default: false
    },
    suspicious: {
      type: Boolean,
      default: false,
      index: true
    },
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date
  }

}, {
  timestamps: true,
  collection: 'auditlogs'
});

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

// Static methods for querying
auditLogSchema.statics.getByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    ...filters
  };
  return this.find(query).sort({ createdAt: -1 });
};

auditLogSchema.statics.getUserTimeline = function(userId, limit = 50) {
  return this.find({
    $or: [
      { performedBy: userId },
      { affectedUser: userId }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('performedBy', 'name role')
  .populate('affectedUser', 'name rollNumber');
};

auditLogSchema.statics.getStatistics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $facet: {
        byAction: [
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        bySeverity: [
          { $group: { _id: '$severity', count: { $sum: 1 } } }
        ],
        total: [
          { $count: 'total' }
        ]
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0];
};

module.exports = mongoose.model('AuditLog', auditLogSchema);