const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { 
  validateExamRegistration, 
  validatePayment, 
  validateRevaluation,
  validateObjectId,
  sanitizeInput
} = require('../middleware/validation');

// Apply sanitization to all routes
router.use(sanitizeInput);

// Get available exams
router.get('/available', 
  authenticateToken, 
  authorize('STUDENT'), 
  examController.getAvailableExams
);

// Register for exam
router.post('/register', 
  authenticateToken, 
  authorize('STUDENT'),
  validateExamRegistration,
  examController.registerForExam
);

// Pay exam fee
router.post('/pay-fee', 
  authenticateToken, 
  authorize('STUDENT'),
  validatePayment,
  examController.payExamFee
);

// Get hall ticket
router.get('/hall-ticket/:registrationId', 
  authenticateToken, 
  authorize('STUDENT'),
  validateObjectId('registrationId'),
  examController.getHallTicket
);

// Get exam results
router.get('/results', 
  authenticateToken, 
  authorize('STUDENT'),
  examController.getExamResults
);

// Request revaluation
router.post('/revaluation', 
  authenticateToken, 
  authorize('STUDENT'),
  validateRevaluation,
  examController.requestRevaluation
);

// Get my registrations
router.get('/my-registrations', 
  authenticateToken, 
  authorize('STUDENT'),
  examController.getMyRegistrations
);

module.exports = router;