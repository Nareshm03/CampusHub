const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  },
  period: {
    type: Number,
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  semester: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

timetableSchema.index({ day: 1, period: 1, department: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);