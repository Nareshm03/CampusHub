const mongoose = require('mongoose');

const librarySchema = new mongoose.Schema({
  book: {
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String, unique: true },
    category: { type: String, default: 'General' },
    description: String,
    coverImage: String,
    totalCopies: { type: Number, default: 1 },
    availableCopies: { type: Number, default: 1 }
  },
  transactions: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: Date,
    status: { type: String, enum: ['ISSUED', 'RETURNED', 'OVERDUE'], default: 'ISSUED' },
    fine: { type: Number, default: 0 }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Library', librarySchema);