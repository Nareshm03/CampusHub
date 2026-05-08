const mongoose = require('mongoose');

/**
 * Student schema for campus management system
 * @typedef {Object} Student
 * @property {mongoose.Types.ObjectId} userId - Reference to User model (required)
 * @property {string} usn - University Seat Number (required, unique)
 * @property {mongoose.Types.ObjectId} department - Reference to Department model (required)
 * @property {number} semester - Current semester (required)
 * @property {mongoose.Types.ObjectId[]} subjects - Array of Subject references
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */
const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  usn: {
    type: String,
    required: [true, 'USN is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required'],
    index: true
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: [1, 'Semester must be at least 1'],
    max: [8, 'Semester cannot exceed 8'],
    index: true
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  phone: {
    type: String,
    trim: true,
    match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number']
  },
  address: {
    type: String,
    trim: true
  },
  guardianName: {
    type: String,
    trim: true
  },
  guardianPhone: {
    type: String,
    trim: true,
    match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number']
  },
  dateOfBirth: {
    type: Date
  },
  admissionYear: {
    type: Number,
    min: [2000, 'Admission year must be valid']
  },
  profilePhoto: {
    type: String,
    default: null
  },
  isAlumni: {
    type: Boolean,
    default: false
  },
  graduationYear: {
    type: Number,
    min: [2000, 'Graduation year must be valid']
  },
  createdAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'students'
});

/**
 * Student model
 * @type {mongoose.Model<Student>}
 */
module.exports = mongoose.model('Student', studentSchema);