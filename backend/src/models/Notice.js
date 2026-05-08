const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    enum: ['COLLEGE', 'DEPARTMENT', 'SEMESTER'],
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['ALL', 'STUDENTS', 'FACULTY'],
    default: 'ALL'
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  semester: {
    type: Number
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notice', noticeSchema);