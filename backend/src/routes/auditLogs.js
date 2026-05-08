const express = require('express');
const router = express.Router();
const {
  getAuditLogs,
  getAuditLogById,
  getStatistics,
  getUserActivity,
  getRecentActivity,
  getSuspiciousActivities,
  flagSuspicious,
  markReviewed,
  exportLogs,
  getMarksAuditLogs,
  getAttendanceAuditLogs
} = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Statistics and analytics (Admin only)
router.get('/statistics', authorize('admin'), getStatistics);
router.get('/recent', authorize('admin'), getRecentActivity);
router.get('/suspicious', authorize('admin'), getSuspiciousActivities);
router.get('/export', authorize('admin'), exportLogs);

// Specific entity type logs (Faculty/Admin)
router.get('/marks', authorize('faculty', 'admin'), getMarksAuditLogs);
router.get('/attendance', authorize('faculty', 'admin'), getAttendanceAuditLogs);

// User activity (Faculty can view their own or students, Admin can view all)
router.get('/user/:userId', authorize('faculty', 'admin'), getUserActivity);

// Admin-only actions
router.patch('/:id/flag', authorize('admin'), flagSuspicious);
router.patch('/:id/review', authorize('admin'), markReviewed);

// General logs (Faculty/Admin)
router.get('/:id', authorize('faculty', 'admin'), getAuditLogById);
router.get('/', authorize('faculty', 'admin'), getAuditLogs);

module.exports = router;
