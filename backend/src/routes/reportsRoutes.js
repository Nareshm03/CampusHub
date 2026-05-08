const express = require('express');
const {
  getAttendanceReport,
  getMarksReport
} = require('../controllers/reportsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/attendance', protect, authorize('ADMIN', 'FACULTY'), getAttendanceReport);
router.get('/marks', protect, authorize('ADMIN', 'FACULTY'), getMarksReport);

module.exports = router;