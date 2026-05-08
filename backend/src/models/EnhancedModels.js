const mongoose = require('mongoose');

// Enhanced Attendance model with proper relationships
const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE'],
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index
attendanceSchema.index({ studentId: 1, subjectId: 1, date: 1 }, { unique: true });

// Enhanced Marks model
const marksSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examType: {
    type: String,
    enum: ['INTERNAL', 'EXTERNAL', 'ASSIGNMENT', 'QUIZ'],
    required: true
  },
  marks: {
    type: Number,
    required: true,
    min: 0
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 1
  }
}, {
  timestamps: true
});

// Subject model with relationships
const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
    index: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  credits: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

module.exports = {
  Attendance: mongoose.model('Attendance', attendanceSchema),
  Marks: mongoose.model('Marks', marksSchema),
  Subject: mongoose.model('Subject', subjectSchema)
};