const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  logo: String,
  website: String,
  industry: {
    type: String,
    enum: ['IT/Software', 'Finance/Banking', 'Manufacturing', 'Consulting', 'Healthcare', 
           'E-commerce', 'Automotive', 'Telecommunications', 'Education', 'Other'],
    default: 'IT/Software'
  },
  description: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  contactPerson: {
    name: String,
    designation: String,
    email: String,
    phone: String
  },
  companySize: {
    type: String,
    enum: ['Startup (<50)', 'Small (50-200)', 'Medium (200-1000)', 'Large (1000-5000)', 'Enterprise (>5000)']
  },
  founded: Number,
  headquarters: String,
  
  // Placement Details
  previousPlacements: [{
    year: Number,
    studentsHired: Number,
    averagePackage: Number,
    highestPackage: Number
  }],
  
  // Preferences
  preferredDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  minimumCGPA: {
    type: Number,
    default: 6.0
  },
  acceptBacklogs: {
    type: Boolean,
    default: false
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Visits
  campusVisits: [{
    date: Date,
    purpose: String,
    attendees: Number,
    notes: String
  }],
  
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

companySchema.index({ name: 'text', industry: 'text' });

module.exports = mongoose.model('Company', companySchema);
