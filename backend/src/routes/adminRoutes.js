const express = require('express');
const {
  getAnalytics,
  importCSV,
  exportCSV,
  getAcademicReports,
  getSettings,
  updateSettings
} = require('../controllers/adminController');
const {
  getAllUsers,
  deleteUser,
  updateUser,
  removeUserAccess
} = require('../controllers/usersController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Analytics
router.get('/analytics', protect, authorize('ADMIN'), getAnalytics);

// Academic Reports
router.get('/academic-reports', protect, authorize('ADMIN'), getAcademicReports);

// Settings
router.get('/settings', protect, authorize('ADMIN'), getSettings);
router.put('/settings', protect, authorize('ADMIN'), updateSettings);

// CSV Import/Export
router.post('/import', protect, authorize('ADMIN'), importCSV);
router.get('/export', protect, authorize('ADMIN'), exportCSV);

// User Management
router.get('/users', protect, authorize('ADMIN'), getAllUsers);
router.delete('/users/:id', protect, authorize('ADMIN'), deleteUser);
router.put('/users/:id', protect, authorize('ADMIN'), updateUser);
router.patch('/users/:id/remove-access', protect, authorize('ADMIN'), removeUserAccess);

module.exports = router;
