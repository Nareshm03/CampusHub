const express = require('express');
const {
  createNotice,
  getNoticesForStudent,
  getNoticesForFaculty,
  getAllNotices,
  deleteNotice
} = require('../controllers/noticeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('ADMIN', 'FACULTY'), createNotice);
router.get('/my', protect, authorize('STUDENT'), getNoticesForStudent);
router.get('/faculty', protect, authorize('FACULTY', 'ADMIN'), getNoticesForFaculty);
router.get('/', protect, authorize('ADMIN', 'FACULTY'), getAllNotices);
router.delete('/:id', protect, authorize('ADMIN'), deleteNotice);

module.exports = router;