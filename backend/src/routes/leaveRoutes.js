const express = require('express');
const {
  applyLeave,
  getMyLeaves,
  getPendingLeaves,
  getAllLeaves,
  reviewLeave
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Student routes
router.post('/', protect, authorize('STUDENT'), applyLeave);
router.get('/my', protect, authorize('STUDENT'), getMyLeaves);

// Faculty/Admin routes
router.get('/pending', protect, authorize('ADMIN', 'FACULTY'), getPendingLeaves);
router.get('/all', protect, authorize('ADMIN', 'FACULTY'), getAllLeaves);
router.put('/:id/review', protect, authorize('ADMIN', 'FACULTY'), reviewLeave);

module.exports = router;