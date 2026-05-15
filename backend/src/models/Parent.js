const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  relationship: {
    type: String,
    enum: ['Father', 'Mother', 'Guardian'],
    default: 'Guardian'
  },
  occupation: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number']
  },
  alternatePhone: {
    type: String,
    trim: true,
    match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number']
  },
  address: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'parents'
});

module.exports = mongoose.model('Parent', parentSchema);
