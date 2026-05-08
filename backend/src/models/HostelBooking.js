const mongoose = require('mongoose');

const hostelBookingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  moveInDate: {
    type: Date,
    required: true
  },
  checkOutDate: {
    type: Date,
    required: true
  },
  preferences: {
    roomType: { type: String, enum: ['SINGLE', 'DOUBLE', 'TRIPLE'], default: 'DOUBLE' },
    floorPreference: { type: String, enum: ['GROUND', 'FIRST', 'SECOND', 'ANY'], default: 'ANY' },
    specialRequirements: { type: String, trim: true, maxlength: 500 }
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT'],
    default: 'PENDING'
  },
  adminNote: { type: String, trim: true },
  allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  allocatedAt: { type: Date }
}, { timestamps: true });

// One active booking per student
hostelBookingSchema.index(
  { student: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['PENDING', 'APPROVED', 'CHECKED_IN'] } } }
);

module.exports = mongoose.model('HostelBooking', hostelBookingSchema);
