const express = require('express');
const {
  getChildProfile,
  getChildAttendance,
  getChildMarks,
  getChildFees,
  getParentNotices,
  linkStudent,
  getDashboard
} = require('../controllers/parentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and PARENT role
router.use(protect, authorize('PARENT'));

router.get('/dashboard', getDashboard);
router.get('/child', getChildProfile);
router.get('/child/attendance', getChildAttendance);
router.get('/child/marks', getChildMarks);
router.get('/child/fees', getChildFees);
router.get('/notices', getParentNotices);
router.post('/link-student', linkStudent);

module.exports = router;
