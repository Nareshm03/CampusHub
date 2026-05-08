const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const {
  createTimetable,
  getStudentTimetable,
  getFacultyTimetable,
  getTimetableByClass,
  createTimetableByFaculty,
  deleteTimetableByFaculty
} = require('../controllers/timetableController');

const validateCreateTimetable = [
  body('day')
    .isIn(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'])
    .withMessage('day must be one of MON, TUE, WED, THU, FRI, SAT'),
  body('period')
    .isInt({ min: 1, max: 10 })
    .withMessage('period must be an integer between 1 and 10'),
  body('subject')
    .isMongoId()
    .withMessage('subject must be a valid MongoDB ObjectId'),
  body('faculty')
    .isMongoId()
    .withMessage('faculty must be a valid MongoDB ObjectId'),
  body('department')
    .isMongoId()
    .withMessage('department must be a valid MongoDB ObjectId'),
  body('semester')
    .isInt({ min: 1, max: 8 })
    .withMessage('semester must be an integer between 1 and 8'),
  handleValidationErrors
];

// BUG FIX: route roles must match the role strings stored in User.role
// auth.js authorize() checks req.user.role — Student model stores 'student' (lowercase)
// but the original routes used 'ADMIN'/'STUDENT'/'FACULTY' (uppercase).
// Align with whatever the User model actually stores. Based on auth.js adminOnly
// checking 'ADMIN' and the User model, uppercase is correct — keep as-is.
router.post('/', protect, authorize('ADMIN'), validateCreateTimetable, createTimetable);
router.get('/student', protect, authorize('STUDENT', 'FACULTY', 'ADMIN'), getStudentTimetable);
router.get('/faculty', protect, authorize('FACULTY', 'ADMIN'), getFacultyTimetable);
router.get('/class', protect, authorize('FACULTY', 'ADMIN'), getTimetableByClass);
router.post('/faculty', protect, authorize('FACULTY', 'ADMIN'), createTimetableByFaculty);
router.delete('/faculty/:id', protect, authorize('FACULTY', 'ADMIN'), deleteTimetableByFaculty);

module.exports = router;
