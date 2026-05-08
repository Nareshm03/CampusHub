const mongoose = require('mongoose');

/**
 * Department schema for college ERP system
 * @typedef {Object} Department
 * @property {string} name - Department name (required, unique)
 * @property {string} code - Department code (unique)
 * @property {string} description - Department description
 * @property {ObjectId} hod - Head of Department (Faculty reference)
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */
const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  createdAt: {
    type: Date
  }
}, {
  strict: true,
  timestamps: true
});

/**
 * Department model
 * @type {mongoose.Model<Department>}
 */
module.exports = mongoose.model('Department', departmentSchema);