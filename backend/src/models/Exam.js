const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  examDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  isExternal: {
    type: Boolean,
    default: false
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  fee: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exam', examSchema);