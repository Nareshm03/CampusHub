const express = require('express');
const {
  enterMarks,
  addOrUpdateMarks,
  getMyMarks,
  getMarksBySubject,
  getMarksByStudent,
  calculateGPA
} = require('../controllers/marksController');
const { protect, authorize, facultySubjectAccess } = require('../middleware/auth');
const { validate, marksValidation } = require('../middleware/validation');

const router = express.Router();

router.post('/entry', protect, authorize('FACULTY', 'ADMIN'), facultySubjectAccess, enterMarks);
router.post('/', protect, authorize('FACULTY'), addOrUpdateMarks);
router.get('/my', protect, authorize('STUDENT'), getMyMarks);
router.get('/subject/:subjectId', protect, authorize('ADMIN', 'FACULTY'), facultySubjectAccess, getMarksBySubject);
router.get('/student/:studentId', protect, getMarksByStudent);
router.get('/gpa/:studentId', protect, calculateGPA);

module.exports = router;