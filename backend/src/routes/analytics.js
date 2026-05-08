const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Dashboard analytics - comprehensive overview
router.get('/dashboard', analyticsController.getDashboardAnalytics);

// Semester-wise comparison
router.get('/semester-comparison', analyticsController.getSemesterComparison);

// Subject-wise performance
router.get('/subject-performance', analyticsController.getSubjectPerformance);

// Class rank tracking
router.get('/rank-tracking', analyticsController.getRankTracking);

// Attendance vs performance correlation
router.get('/attendance-correlation', analyticsController.getAttendanceCorrelation);

// Predictive analytics
router.get('/predictions', analyticsController.getPredictiveAnalytics);

// Department-wide analytics (faculty/admin only)
router.get(
  '/department',
  authorize('faculty', 'admin'),
  analyticsController.getDepartmentAnalytics
);

module.exports = router;
