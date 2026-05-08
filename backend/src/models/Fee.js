const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  academicYear: {
    type: String,
    required: true
  },
  tuitionFee: {
    type: Number,
    required: true,
    default: 0
  },
  examFee: {
    type: Number,
    default: 0
  },
  libraryFee: {
    type: Number,
    default: 0
  },
  labFee: {
    type: Number,
    default: 0
  },
  otherFees: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'],
    default: 'PENDING'
  },
  payments: [{
    amount: Number,
    paymentDate: Date,
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE']
    },
    transactionId: String,
    receiptNumber: String
  }]
}, {
  timestamps: true
});

feeSchema.pre('save', function(next) {
  this.totalAmount = this.tuitionFee + this.examFee + this.libraryFee + this.labFee + this.otherFees;
  
  if (this.paidAmount >= this.totalAmount) {
    this.status = 'PAID';
  } else if (this.paidAmount > 0) {
    this.status = 'PARTIAL';
  } else if (new Date() > this.dueDate) {
    this.status = 'OVERDUE';
  }
  
  next();
});

module.exports = mongoose.model('Fee', feeSchema);