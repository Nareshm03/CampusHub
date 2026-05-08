const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  examType: {
    type: String,
    required: true,
    enum: ['INTERNAL', 'EXTERNAL', 'ASSIGNMENT', 'QUIZ'],
    index: true
  },
  examName: {
    type: String,
    required: true,
    index: true
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
  },
  grade: {
    type: String,
    required: true
  },
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Legacy fields for backward compatibility
  internal1: {
    type: Number,
    default: 0,
    min: 0
  },
  internal2: {
    type: Number,
    default: 0,
    min: 0
  },
  internal3: {
    type: Number,
    default: 0,
    min: 0
  },
  assignment1: {
    type: Number,
    default: 0,
    min: 0
  },
  assignment2: {
    type: Number,
    default: 0,
    min: 0
  },
  altAssignment1: {
    type: Number,
    default: 0,
    min: 0
  },
  altAssignment2: {
    type: Number,
    default: 0,
    min: 0
  },
  external: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Unique compound index to prevent duplicate entries for same exam
marksSchema.index({ student: 1, subject: 1, examType: 1, examName: 1 }, { unique: true });

module.exports = mongoose.model('Marks', marksSchema);