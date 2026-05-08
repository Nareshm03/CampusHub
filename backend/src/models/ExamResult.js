const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  marksObtained: {
    type: Number,
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pass', 'fail', 'absent'],
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  revaluationRequested: {
    type: Boolean,
    default: false
  },
  revaluationStatus: {
    type: String,
    enum: ['none', 'requested', 'in_progress', 'completed'],
    default: 'none'
  },
  revaluationMarks: {
    type: Number
  },
  revaluationGrade: {
    type: String
  }
}, {
  timestamps: true
});

examResultSchema.index({ student: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model('ExamResult', examResultSchema);