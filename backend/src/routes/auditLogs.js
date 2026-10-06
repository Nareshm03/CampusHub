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
router.get('/statistics', authorize('ADMIN'), getStatistics);
router.get('/recent', authorize('ADMIN'), getRecentActivity);
router.get('/suspicious', authorize('ADMIN'), getSuspiciousActivities);
router.get('/export', authorize('ADMIN'), exportLogs);

// Specific entity type logs (Faculty/Admin)
router.get('/marks', authorize('FACULTY', 'ADMIN'), getMarksAuditLogs);
router.get('/attendance', authorize('FACULTY', 'ADMIN'), getAttendanceAuditLogs);

// User activity (Faculty can view their own or students, Admin can view all)
router.get('/user/:userId', authorize('FACULTY', 'ADMIN'), getUserActivity);

// Admin-only actions
router.patch('/:id/flag', authorize('ADMIN'), flagSuspicious);
router.patch('/:id/review', authorize('ADMIN'), markReviewed);

// General logs (Faculty/Admin)
router.get('/:id', authorize('FACULTY', 'ADMIN'), getAuditLogById);
router.get('/', authorize('FACULTY', 'ADMIN'), getAuditLogs);

module.exports = router;
