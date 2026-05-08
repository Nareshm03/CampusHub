const express = require('express');
const { body, query } = require('express-validator');
const {
  createCourse,
  getCourses,
  getCourseCatalogue,
  getCourseById,
  enrollStudent,
  registerCourses,
  dropCourse,
  getAvailableCourses
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

const validateRegister = [
  body('courseIds').isArray({ min: 1 }).withMessage('At least one course required'),
  body('courseIds.*').isMongoId().withMessage('Invalid course ID'),
  handleValidationErrors
];

const validateCreate = [
  body('name').trim().notEmpty().withMessage('Course name required'),
  body('code').trim().notEmpty().toUpperCase().withMessage('Course code required'),
  body('credits').isInt({ min: 1, max: 10 }).withMessage('Credits must be 1-10'),
  body('department').isMongoId().withMessage('Valid department ID required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be 1-8'),
  body('maxSeats').optional().isInt({ min: 1 }).withMessage('Max seats must be positive'),
  handleValidationErrors
];

router.get('/catalogue', protect, getCourseCatalogue);
router.get('/available', protect, getAvailableCourses);
router.get('/', protect, getCourses);
router.post('/', protect, authorize('ADMIN'), validateCreate, createCourse);
router.get('/:id', protect, getCourseById);
router.post('/:courseId/enroll', protect, authorize('ADMIN'), enrollStudent);
router.post('/register', protect, validateRegister, registerCourses);
router.delete('/:courseId/drop', protect, dropCourse);

module.exports = router;