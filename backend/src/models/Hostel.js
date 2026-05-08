const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['BOYS', 'GIRLS'], required: true },
  rooms: [{
    number: { type: String, required: true },
    capacity: { type: Number, default: 2 },
    occupants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    rent: { type: Number, required: true },
    facilities: [String]
  }],
  mess: {
    monthlyFee: { type: Number, default: 3000 },
    menu: [{
      day: String,
      breakfast: String,
      lunch: String,
      dinner: String
    }]
  }
}, { timestamps: true });

module.exports = mongoose.model('Hostel', hostelSchema);