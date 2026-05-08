const express = require('express');
const {
  getFacultyUsers,
  getFacultyInMyDepartment,
  getAllUsers,
  deleteUser,
  updateUser,
  removeUserAccess
} = require('../controllers/usersController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/faculty/department', protect, authorize('FACULTY'), getFacultyInMyDepartment);
router.get('/faculty', protect, authorize('ADMIN'), getFacultyUsers);
router.get('/', protect, authorize('ADMIN'), getAllUsers);
router.delete('/:id', protect, authorize('ADMIN'), deleteUser);
router.put('/:id', protect, authorize('ADMIN'), updateUser);
router.patch('/:id/remove-access', protect, authorize('ADMIN'), removeUserAccess);

module.exports = router;