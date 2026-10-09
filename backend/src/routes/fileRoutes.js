const express = require('express');
const { protect } = require('../middleware/auth');
const { serveFile } = require('../controllers/fileController');

const router = express.Router();

// All file access requires authentication; per-category authorization
// lives in fileController (no token in URL, no path leakage).
router.get('/:category/:filename', protect, serveFile);

module.exports = router;
