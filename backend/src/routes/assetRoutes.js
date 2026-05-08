const express = require('express');
const assetController = require('../controllers/assetController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('ADMIN'), assetController.createAsset);
router.get('/', assetController.getAssets);
router.get('/stats', assetController.getAssetStats);
router.put('/:id', authorize('ADMIN'), assetController.updateAsset);
router.post('/:id/maintenance', authorize('ADMIN'), assetController.addMaintenance);

module.exports = router;