const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  graduationYear: {
    type: Number,
    required: true,
    min: [2000, 'Graduation year must be valid']
  },
  currentCompany: {
    type: String,
    trim: true
  },
  currentPosition: {
    type: String,
    trim: true
  },
  currentSalary: {
    type: Number,
    min: 0
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  linkedinProfile: {
    type: String,
    trim: true
  },
  achievements: [{
    title: String,
    description: String,
    date: Date
  }],
  jobPostings: [{
    title: String,
    company: String,
    description: String,
    requirements: String,
    location: String,
    salary: String,
    applicationDeadline: Date,
    contactEmail: String,
    isActive: { type: Boolean, default: true },
    postedAt: { type: Date, default: Date.now }
  }],
  mentorshipOffered: {
    type: Boolean,
    default: false
  },
  mentorshipAreas: [String],
  mentoringStudents: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    startDate: Date,
    status: { type: String, enum: ['active', 'completed'], default: 'active' }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'alumni'
});

module.exports = mongoose.model('Alumni', alumniSchema);