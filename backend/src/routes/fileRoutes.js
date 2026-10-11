const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { serveFile, getUsage } = require('../controllers/fileController');

const router = express.Router();

// All file access requires authentication; per-category authorization
// lives in fileController (no token in URL, no path leakage).
// Static route first so "usage" is never treated as a category.
router.get('/usage', protect, authorize('ADMIN'), getUsage);
router.get('/:category/:filename', protect, serveFile);

module.exports = router;
