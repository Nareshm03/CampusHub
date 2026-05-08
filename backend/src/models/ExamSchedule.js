const mongoose = require('mongoose');

const examScheduleSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    index: true
  },
  examType: {
    type: String,
    enum: ['MIDTERM', 'ENDTERM', 'QUARTERLY', 'SEMESTER', 'ANNUAL', 'REMEDIAL', 'MAKEUP'],
    required: [true, 'Exam type is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Exam name is required'],
    trim: true
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
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    index: true
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  registrationStartDate: {
    type: Date,
    required: true
  },
  registrationEndDate: {
    type: Date,
    required: true,
    index: true
  },
  subjects: [{
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    examDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true,
      comment: 'Duration in minutes'
    },
    venue: {
      type: String,
      required: true
    },
    maxMarks: {
      type: Number,
      required: true,
      default: 100
    },
    passingMarks: {
      type: Number,
      required: true,
      default: 40
    },
    invigilators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    roomCapacity: {
      type: Number,
      default: 60
    },
    specialInstructions: String
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED'],
    default: 'DRAFT',
    index: true
  },
  registrationFee: {
    type: Number,
    default: 0
  },
  instructions: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedAt: {
    type: Date
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    index: true
  }
}, {
  timestamps: true
});

// Validate dates
examScheduleSchema.pre('save', function(next) {
  if (this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
  }
  if (this.registrationEndDate < this.registrationStartDate) {
    next(new Error('Registration end date must be after registration start date'));
  }
  next();
});

// Index for efficient queries
examScheduleSchema.index({ department: 1, semester: 1, academicYear: 1 });
examScheduleSchema.index({ startDate: 1, endDate: 1 });
examScheduleSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
