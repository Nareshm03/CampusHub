const Asset = require('../models/Asset');

const assetController = {
  // Create new asset
  createAsset: async (req, res) => {
    try {
      const asset = new Asset(req.body);
      await asset.save();
      await asset.populate('location.department assignedTo', 'name email');
      res.status(201).json({ success: true, data: asset });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get all assets
  getAssets: async (req, res) => {
    try {
      const { category, status, location, page = 1, limit = 10 } = req.query;
      const filter = {};
      
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (location) filter['location.building'] = new RegExp(location, 'i');
      
      const assets = await Asset.find(filter)
        .populate('location.department assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
        
      const total = await Asset.countDocuments(filter);
      
      res.json({
        success: true,
        data: assets,
        pagination: { page: +page, limit: +limit, total }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update asset
  updateAsset: async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await Asset.findByIdAndUpdate(id, req.body, { new: true })
        .populate('location.department assignedTo', 'name email');
      res.json({ success: true, data: asset });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Add maintenance record
  addMaintenance: async (req, res) => {
    try {
      const { id } = req.params;
      const maintenanceRecord = {
        ...req.body,
        date: new Date()
      };
      
      const asset = await Asset.findByIdAndUpdate(
        id,
        { $push: { maintenanceHistory: maintenanceRecord } },
        { new: true }
      ).populate('location.department assignedTo', 'name email');
      
      res.json({ success: true, data: asset });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get asset statistics
  getAssetStats: async (req, res) => {
    try {
      const stats = await Asset.aggregate([
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
            available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
            inUse: { $sum: { $cond: [{ $eq: ['$status', 'in_use'] }, 1, 0] } },
            maintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } }
          }
        }
      ]);
      
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = assetController;