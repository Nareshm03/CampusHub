const express = require('express');
const {
  getChildProfile,
  getChildAttendance,
  getChildMarks,
  getChildFees,
  getParentNotices,
  linkStudent,
  getDashboard,
  getDetailedAttendance,
  getChildCGPA,
  getChildAssignments,
  getChildExams,
  exportAttendanceReport,
  exportPerformanceReport,
  getParentsCount,
  getAllParents
} = require('../controllers/parentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Admin routes
router.get('/count', protect, authorize('ADMIN'), getParentsCount);
router.get('/all', protect, authorize('ADMIN'), getAllParents);

// All routes below require authentication and PARENT role
router.use(protect, authorize('PARENT'));

router.get('/dashboard', getDashboard);
router.get('/child', getChildProfile);
router.get('/child/attendance', getChildAttendance);
router.get('/child/attendance/detailed', getDetailedAttendance);
router.get('/child/attendance/export', exportAttendanceReport);
router.get('/child/marks', getChildMarks);
router.get('/child/cgpa', getChildCGPA);
router.get('/child/assignments', getChildAssignments);
router.get('/child/exams', getChildExams);
router.get('/child/performance/export', exportPerformanceReport);
router.get('/child/fees', getChildFees);
router.get('/notices', getParentNotices);
router.post('/link-student', linkStudent);

module.exports = router;
