const express = require('express');
const { markAttendance, getAttendance, getAttendanceSummary, getAttendanceTrends, getStudentAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const { validate, attendanceValidation } = require('../middleware/validation');
const { requirePermission, applyPermissionFilter, RESOURCES, ACTIONS } = require('../middleware/rbac');

const router = express.Router();

// RBAC/ABAC enabled routes
// Faculty and Admin can mark attendance (ABAC will check if faculty teaches the subject)
router.post('/mark', 
  protect, 
  requirePermission(RESOURCES.ATTENDANCE, ACTIONS.CREATE),
  markAttendance
);

// All authenticated users can view attendance (ABAC will filter based on role)
router.get('/', 
  protect, 
  requirePermission(RESOURCES.ATTENDANCE, ACTIONS.LIST),
  applyPermissionFilter(),
  getAttendance
);

// Student-specific routes (no studentId param needed)
router.get('/my-summary',
  protect,
  authorize('STUDENT'),
  getAttendanceSummary
);

router.get('/my-records',
  protect,
  authorize('STUDENT'),
  getStudentAttendance
);

router.get('/my-trends',
  protect,
  authorize('STUDENT'),
  getAttendanceTrends
);

// Get attendance summary for specific student
router.get('/summary/:studentId', 
  protect, 
  requirePermission(RESOURCES.ATTENDANCE, ACTIONS.READ),
  getAttendanceSummary
);

// Get attendance trends
router.get('/trends/:studentId', 
  protect, 
  requirePermission(RESOURCES.ATTENDANCE, ACTIONS.READ),
  getAttendanceTrends
);

// Get student attendance
router.get('/student/:studentId', 
  protect, 
  requirePermission(RESOURCES.ATTENDANCE, ACTIONS.READ),
  getStudentAttendance
);

module.exports = router;