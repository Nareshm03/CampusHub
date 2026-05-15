const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
const validateObjectId = (field) => {
  return param(field).custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid ID format');
    }
    return true;
  });
};

const validateEmail = () => {
  return body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required');
};

const validatePassword = () => {
  return body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character');
};

const validateUSN = () => {
  return body('usn')
    .matches(/^[A-Z0-9]{3,15}$/)
    .withMessage('USN must be 3-15 alphanumeric characters');
};

const validatePhone = () => {
  return body('phone')
    .matches(/^\d{10}$/)
    .withMessage('Phone must be 10 digits');
};

// Exam validation
const validateExamRegistration = [
  body('examId').isMongoId().withMessage('Valid exam ID required'),
  body('formData.personalDetails.name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('formData.personalDetails.usn').matches(/^[A-Z0-9]{10}$/).withMessage('Invalid USN format'),
  body('formData.personalDetails.email').isEmail().normalizeEmail(),
  body('formData.personalDetails.phone').matches(/^\d{10}$/),
  body('formData.academicDetails.semester').isInt({ min: 1, max: 8 }),
  handleValidationErrors
];

const validatePayment = [
  body('registrationId').isMongoId().withMessage('Valid registration ID required'),
  body('paymentId').trim().isLength({ min: 5, max: 50 }).withMessage('Valid payment ID required'),
  handleValidationErrors
];

const validateRevaluation = [
  body('resultId').isMongoId().withMessage('Valid result ID required'),
  handleValidationErrors
];

// User validation
const validateUserRegistration = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  validateEmail(),
  validatePassword(),
  body('role').isIn(['STUDENT', 'FACULTY', 'ADMIN', 'PARENT']).withMessage('Invalid role'),
  handleValidationErrors
];

const validateUserLogin = [
  validateEmail(),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors
];

// Student validation
const validateStudentCreate = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  validateEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('usn').matches(/^[A-Z0-9]{3,15}$/).withMessage('USN must be 3-15 alphanumeric characters'),
  body('department').isMongoId().withMessage('Valid department ID required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
  body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
  body('guardianName').optional().trim().isLength({ min: 1, max: 50 }),
  body('guardianPhone').optional().matches(/^\d{10}$/).withMessage('Guardian phone must be 10 digits'),
  handleValidationErrors
];

const validateStudentUpdate = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
  body('semester').optional().isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
  body('guardianName').optional().trim().isLength({ min: 1, max: 50 }),
  body('guardianPhone').optional().matches(/^\d{10}$/),
  handleValidationErrors
];

// Sanitize input to prevent XSS
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

// Export validation middleware
const validate = handleValidationErrors;

const userValidation = {
  register: validateUserRegistration,
  login: validateUserLogin
};

const studentValidation = {
  create: validateStudentCreate,
  update: validateStudentUpdate
};

module.exports = {
  handleValidationErrors,
  validate,
  userValidation,
  studentValidation,
  validateObjectId,
  validateEmail,
  validatePassword,
  validateUSN,
  validatePhone,
  validateExamRegistration,
  validatePayment,
  validateRevaluation,
  validateUserRegistration,
  validateUserLogin,
  validateStudentCreate,
  validateStudentUpdate,
  sanitizeInput
};