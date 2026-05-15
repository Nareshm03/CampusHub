const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject is required'],
    index: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: [true, 'Faculty is required'],
    index: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required'],
    index: true
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: [1, 'Semester must be at least 1'],
    max: [8, 'Semester cannot exceed 8'],
    index: true
  },
  assignedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    index: true
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 100,
    min: [1, 'Total marks must be at least 1']
  },
  attachments: [{
    filename: String,
    filepath: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  instructions: {
    type: String,
    default: ''
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
  submissionType: {
    type: String,
    enum: ['FILE', 'TEXT', 'BOTH'],
    default: 'FILE'
  },
  maxFileSize: {
    type: Number,
    default: 10485760 // 10MB in bytes
  },
  allowedFileTypes: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'CLOSED', 'GRADED'],
    default: 'PUBLISHED',
    index: true
  },
  visibility: {
    type: String,
    enum: ['ALL', 'SPECIFIC_STUDENTS'],
    default: 'ALL'
  },
  targetStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  rubric: [{
    criterion: String,
    maxPoints: Number,
    description: String
  }],
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    index: true
  }
}, {
  timestamps: true
});

// Virtual for checking if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate && this.status !== 'CLOSED' && this.status !== 'GRADED';
});

// Virtual for time remaining
assignmentSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const due = new Date(this.dueDate);
  const diff = due - now;
  
  if (diff < 0) return 'Overdue';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
});

// Index for efficient queries
assignmentSchema.index({ subject: 1, dueDate: 1 });
assignmentSchema.index({ faculty: 1, status: 1 });
assignmentSchema.index({ department: 1, semester: 1, status: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
