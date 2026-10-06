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
const multer = require('multer');

const router = express.Router();

// CSV upload handling for ADMIN bulk import (memory storage: parsed and
// discarded in-request, no temp files left behind).
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const nameOk = /\.csv$/i.test(file.originalname || '');
    const typeOk = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'].includes(file.mimetype);
    if (nameOk && typeOk) return cb(null, true);
    cb(new Error('Only .csv files are allowed'));
  }
});

const handleCsvUpload = (req, res, next) => {
  csvUpload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

// Analytics
router.get('/analytics', protect, authorize('ADMIN'), getAnalytics);

// Academic Reports
router.get('/academic-reports', protect, authorize('ADMIN'), getAcademicReports);

// Settings
router.get('/settings', protect, authorize('ADMIN'), getSettings);
router.put('/settings', protect, authorize('ADMIN'), updateSettings);

// CSV Import/Export (explicit type; import requires multipart file upload)
router.post('/import', protect, authorize('ADMIN'), handleCsvUpload, importCSV);
router.get('/export/:type', protect, authorize('ADMIN'), exportCSV);

// User Management
router.get('/users', protect, authorize('ADMIN'), getAllUsers);
router.delete('/users/:id', protect, authorize('ADMIN'), deleteUser);
router.put('/users/:id', protect, authorize('ADMIN'), updateUser);
router.patch('/users/:id/remove-access', protect, authorize('ADMIN'), removeUserAccess);

module.exports = router;
