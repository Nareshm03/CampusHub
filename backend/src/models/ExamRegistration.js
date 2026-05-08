const mongoose = require('mongoose');

const examRegistrationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  registrationNumber: {
    type: String,
    unique: true,
    required: true
  },
  hallTicketNumber: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ['registered', 'fee_pending', 'confirmed', 'cancelled'],
    default: 'registered'
  },
  feeStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentId: {
    type: String
  },
  formData: {
    personalDetails: {
      name: String,
      usn: String,
      email: String,
      phone: String,
      address: String
    },
    academicDetails: {
      department: String,
      semester: Number,
      subjects: [String]
    }
  }
}, {
  timestamps: true
});

examRegistrationSchema.index({ student: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model('ExamRegistration', examRegistrationSchema);