const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, 'Assignment is required'],
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required'],
    index: true
  },
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  textSubmission: {
    type: String
  },
  files: [{
    filename: String,
    filepath: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['SUBMITTED', 'LATE', 'GRADED', 'RETURNED'],
    default: 'SUBMITTED',
    index: true
  },
  isLate: {
    type: Boolean,
    default: false
  },
  marksObtained: {
    type: Number,
    min: 0
  },
  feedback: {
    type: String
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  },
  rubricScores: [{
    criterion: String,
    points: Number,
    maxPoints: Number,
    feedback: String
  }],
  plagiarismScore: {
    type: Number,
    min: 0,
    max: 100
  },
  revisionRequested: {
    type: Boolean,
    default: false
  },
  revisionFeedback: {
    type: String
  },
  revisionDeadline: {
    type: Date
  },
  version: {
    type: Number,
    default: 1
  },
  previousSubmissions: [{
    files: [{
      filename: String,
      filepath: String,
      mimetype: String,
      size: Number
    }],
    textSubmission: String,
    submittedAt: Date
  }],
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    index: true
  }
}, {
  timestamps: true
});

// Compound index for unique submission per student per assignment
assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

// Index for efficient queries
assignmentSubmissionSchema.index({ status: 1, submittedAt: -1 });
assignmentSubmissionSchema.index({ student: 1, status: 1 });

// Virtual for percentage score
assignmentSubmissionSchema.virtual('percentage').get(function() {
  if (!this.marksObtained || !this.populated('assignment')) return null;
  return ((this.marksObtained / this.assignment.totalMarks) * 100).toFixed(2);
});

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
