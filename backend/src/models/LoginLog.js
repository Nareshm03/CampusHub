const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'FACULTY', 'STUDENT', 'PARENT'],
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  deviceType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    required: true,
    index: true
  },
  failureReason: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

loginLogSchema.index({ timestamp: -1 });
loginLogSchema.index({ user: 1, timestamp: -1 });
loginLogSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('LoginLog', loginLogSchema);
