const mongoose = require('mongoose');

const academicCalendarSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  events: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    type: {
      type: String,
      enum: ['EXAM', 'HOLIDAY', 'REGISTRATION', 'ORIENTATION', 'OTHER'],
      default: 'OTHER'
    },
    isHoliday: {
      type: Boolean,
      default: false
    }
  }],
  examSchedule: {
    internal1: {
      startDate: Date,
      endDate: Date
    },
    internal2: {
      startDate: Date,
      endDate: Date
    },
    internal3: {
      startDate: Date,
      endDate: Date
    },
    external: {
      startDate: Date,
      endDate: Date
    }
  }
}, {
  timestamps: true
});

academicCalendarSchema.index({ academicYear: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);