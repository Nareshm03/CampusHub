const express = require('express');
const {
  addFaculty,
  getMyProfile,
  updateFaculty,
  getAllFaculty
} = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('ADMIN'), addFaculty);
router.get('/me', protect, authorize('FACULTY'), getMyProfile);
router.put('/:id', protect, authorize('ADMIN'), updateFaculty);
router.get('/count', protect, authorize('ADMIN'), async (req, res) => {
  const Faculty = require('../models/Faculty');
  const count = await Faculty.countDocuments();
  res.json({ success: true, data: { count } });
});

router.get('/', protect, authorize('ADMIN'), getAllFaculty);

module.exports = router;