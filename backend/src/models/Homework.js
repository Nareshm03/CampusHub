const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  dueDate: {
    type: Date,
    required: true
  },
  totalPoints: {
    type: Number,
    required: true,
    default: 100
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  latePenaltyPercentage: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  latePenaltyPerDay: {
    type: Boolean,
    default: true
  },
  maxLateDays: {
    type: Number,
    default: 3
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  instructions: {
    type: String
  },
  allowedFileTypes: [{
    type: String,
    enum: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'zip', 'rar']
  }],
  maxFileSize: {
    type: Number,
    default: 10485760 // 10MB in bytes
  },
  enablePlagiarismCheck: {
    type: Boolean,
    default: true
  },
  plagiarismThreshold: {
    type: Number,
    default: 30,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  submissionCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
homeworkSchema.index({ course: 1, dueDate: -1 });
homeworkSchema.index({ faculty: 1, createdAt: -1 });
homeworkSchema.index({ department: 1, isActive: 1 });

// Virtual for checking if homework is overdue
homeworkSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate;
});

// Method to calculate late penalty
homeworkSchema.methods.calculateLatePenalty = function(submittedAt) {
  if (!this.allowLateSubmission || submittedAt <= this.dueDate) {
    return 0;
  }

  const daysLate = Math.ceil((submittedAt - this.dueDate) / (1000 * 60 * 60 * 24));
  
  if (daysLate > this.maxLateDays) {
    return 100; // Full penalty, submission not accepted
  }

  if (this.latePenaltyPerDay) {
    return Math.min(this.latePenaltyPercentage * daysLate, 100);
  } else {
    return this.latePenaltyPercentage;
  }
};

module.exports = mongoose.model('Homework', homeworkSchema);
