const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const facultyAnalyticsController = require('../controllers/facultyAnalyticsController');

// Faculty analytics routes - Only accessible by faculty
router.get('/dashboard', protect, authorize('FACULTY'), facultyAnalyticsController.getFacultyDashboard);
router.get('/subject/:subjectId', protect, authorize('FACULTY'), facultyAnalyticsController.getSubjectAnalytics);
router.get('/plagiarism-trends', protect, authorize('FACULTY'), facultyAnalyticsController.getPlagiarismTrends);
router.get('/attendance-consistency', protect, authorize('FACULTY'), facultyAnalyticsController.getAttendanceConsistency);

module.exports = router;
