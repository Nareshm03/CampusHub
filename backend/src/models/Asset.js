const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['laboratory_equipment', 'library_book', 'furniture', 'electronics', 'vehicle', 'other']
  },
  description: String,
  location: {
    building: String,
    room: String,
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }
  },
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'damaged', 'disposed'],
    default: 'available'
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  purchaseDate: Date,
  purchasePrice: Number,
  vendor: String,
  warrantyExpiry: Date,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  maintenanceHistory: [{
    date: Date,
    description: String,
    cost: Number,
    performedBy: String
  }],
  specifications: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

assetSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Asset').countDocuments();
    this.assetId = `AST${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Asset', assetSchema);