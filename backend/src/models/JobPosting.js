const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Job Details
  jobType: {
    type: String,
    enum: ['Full-time', 'Internship', 'Contract', 'Part-time'],
    required: true
  },
  duration: String, // For internships/contracts
  location: {
    city: String,
    state: String,
    country: String,
    type: {
      type: String,
      enum: ['On-site', 'Remote', 'Hybrid'],
      default: 'On-site'
    }
  },
  
  // Compensation
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'INR'
    },
    period: {
      type: String,
      enum: ['Annual', 'Monthly', 'Per Month'],
      default: 'Annual'
    }
  },
  ctc: Number, // Cost to Company (Annual)
  
  // Eligibility
  eligibility: {
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    semesters: [Number],
    minimumCGPA: {
      type: Number,
      default: 6.0
    },
    minimumPercentage: Number,
    maxBacklogs: {
      type: Number,
      default: 0
    },
    graduationYear: Number
  },
  
  // Requirements
  requiredSkills: [String],
  preferredSkills: [String],
  qualifications: [String],
  experience: {
    min: {
      type: Number,
      default: 0
    },
    max: Number
  },
  
  // Job Specifics
  positions: {
    type: Number,
    default: 1
  },
  responsibilities: [String],
  benefits: [String],
  
  // Application Process
  applicationDeadline: {
    type: Date,
    required: true
  },
  interviewProcess: {
    rounds: [{
      name: String,
      description: String,
      duration: String
    }],
    totalRounds: Number
  },
  
  // Additional Documents Required
  documentsRequired: [{
    type: String,
    enum: ['Resume', 'Cover Letter', 'Marksheets', 'Portfolio', 'Certificates', 'ID Proof', 'Other']
  }],
  
  // Status
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Closed', 'Cancelled'],
    default: 'Draft'
  },
  publishedAt: Date,
  closedAt: Date,
  
  // Applications
  applications: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Pending', 'Shortlisted', 'Rejected', 'Interview Scheduled', 'Selected', 'Offer Extended', 'Offer Accepted', 'Offer Rejected'],
      default: 'Pending'
    },
    resume: String,
    coverLetter: String,
    documents: [{
      name: String,
      url: String
    }],
    interviews: [{
      round: String,
      scheduledAt: Date,
      completedAt: Date,
      result: {
        type: String,
        enum: ['Pass', 'Fail', 'Pending']
      },
      feedback: String,
      score: Number
    }],
    offerDetails: {
      ctc: Number,
      joiningDate: Date,
      location: String,
      offerLetterUrl: String
    },
    notes: String
  }],
  
  // Statistics
  views: {
    type: Number,
    default: 0
  },
  
  // Posted by
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
jobPostingSchema.index({ title: 'text', description: 'text' });
jobPostingSchema.index({ company: 1, status: 1 });
jobPostingSchema.index({ 'eligibility.departments': 1 });
jobPostingSchema.index({ status: 1, applicationDeadline: 1 });

// Virtual for application count
jobPostingSchema.virtual('applicationCount').get(function() {
  return this.applications.length;
});

// Virtual for shortlisted count
jobPostingSchema.virtual('shortlistedCount').get(function() {
  return this.applications.filter(app => app.status === 'Shortlisted').length;
});

// Virtual for selected count
jobPostingSchema.virtual('selectedCount').get(function() {
  return this.applications.filter(app => app.status === 'Selected').length;
});

// Methods

// Check if student is eligible
jobPostingSchema.methods.isStudentEligible = function(student) {
  const { departments, semesters, minimumCGPA, maxBacklogs, graduationYear } = this.eligibility;
  
  // Check department
  if (departments.length > 0 && !departments.some(dept => dept.toString() === student.department.toString())) {
    return { eligible: false, reason: 'Department not eligible' };
  }
  
  // Check semester
  if (semesters.length > 0 && !semesters.includes(student.semester)) {
    return { eligible: false, reason: 'Semester not eligible' };
  }
  
  // Check CGPA
  if (student.cgpa < minimumCGPA) {
    return { eligible: false, reason: `Minimum CGPA required: ${minimumCGPA}` };
  }
  
  // Check backlogs
  if (student.backlogs > maxBacklogs) {
    return { eligible: false, reason: `Maximum ${maxBacklogs} backlogs allowed` };
  }
  
  // Check graduation year
  if (graduationYear && student.graduationYear !== graduationYear) {
    return { eligible: false, reason: `Only ${graduationYear} batch eligible` };
  }
  
  return { eligible: true };
};

// Check if student has already applied
jobPostingSchema.methods.hasStudentApplied = function(studentId) {
  return this.applications.some(app => app.student.toString() === studentId.toString());
};

// Get student's application
jobPostingSchema.methods.getStudentApplication = function(studentId) {
  return this.applications.find(app => app.student.toString() === studentId.toString());
};

// Add application
jobPostingSchema.methods.addApplication = function(applicationData) {
  this.applications.push(applicationData);
};

// Update application status
jobPostingSchema.methods.updateApplicationStatus = function(studentId, status, additionalData = {}) {
  const application = this.applications.find(app => app.student.toString() === studentId.toString());
  if (application) {
    application.status = status;
    Object.assign(application, additionalData);
    return application;
  }
  return null;
};

// Schedule interview
jobPostingSchema.methods.scheduleInterview = function(studentId, interviewData) {
  const application = this.applications.find(app => app.student.toString() === studentId.toString());
  if (application) {
    application.interviews.push(interviewData);
    if (application.status === 'Pending' || application.status === 'Shortlisted') {
      application.status = 'Interview Scheduled';
    }
    return application;
  }
  return null;
};

// Increment view count
jobPostingSchema.methods.incrementViews = function() {
  this.views += 1;
};

// Pre-save middleware
jobPostingSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'Published' && !this.publishedAt) {
      this.publishedAt = new Date();
    } else if (this.status === 'Closed' && !this.closedAt) {
      this.closedAt = new Date();
    }
  }
  next();
});

module.exports = mongoose.model('JobPosting', jobPostingSchema);
