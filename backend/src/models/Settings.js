const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Academic Year Settings
  academicYear: {
    type: String,
    required: true,
    default: '2024-25'
  },
  currentSemester: {
    type: Number,
    required: true,
    min: 1,
    max: 8,
    default: 1
  },
  semesterStartDate: {
    type: Date
  },
  semesterEndDate: {
    type: Date
  },
  examStartDate: {
    type: Date
  },
  examEndDate: {
    type: Date
  },
  
  // Grading System Settings
  gradingScale: {
    type: String,
    enum: ['CGPA', 'GPA', 'PERCENTAGE'],
    default: 'CGPA'
  },
  passingMarks: {
    type: Number,
    required: true,
    default: 40,
    min: 0,
    max: 100
  },
  maxMarks: {
    type: Number,
    required: true,
    default: 100,
    min: 1,
    max: 200
  },
  attendanceRequired: {
    type: Number,
    required: true,
    default: 75,
    min: 0,
    max: 100
  },
  
  // College Information
  collegeName: {
    type: String,
    default: 'Campus Hub'
  },
  collegeCode: {
    type: String
  },
  collegeAddress: {
    type: String
  },
  collegeEmail: {
    type: String
  },
  collegePhone: {
    type: String
  },
  collegeWebsite: {
    type: String
  },
  
  // System Configuration
  enableEmailNotifications: {
    type: Boolean,
    default: true
  },
  enableSMSNotifications: {
    type: Boolean,
    default: false
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  
  // Singleton pattern - only one settings document
  isActive: {
    type: Boolean,
    default: true,
    unique: true
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.models.Settings.countDocuments();
    if (count > 0) {
      throw new Error('Settings document already exists. Update the existing one.');
    }
  }
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
