const express = require('express');
const {
  addStudent,
  getMyProfile,
  updateStudent,
  getAllStudents,
  getStudentsByDepartmentAndSemester,
  uploadProfilePhoto,
  markAsAlumni,
  getAllAlumni,
  enrollStudentsInSubject
} = require('../controllers/studentController');
const { protect, authorize, checkOwnership } = require('../middleware/auth');
const { validate, studentValidation } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');
const upload = require('../utils/upload');
const { requirePermission, applyPermissionFilter, checkOwnership: rbacCheckOwnership, RESOURCES, ACTIONS } = require('../middleware/rbac');

const router = express.Router();

// RBAC/ABAC enabled routes
// Admin can create students
router.post('/', 
  protect, 
  requirePermission(RESOURCES.STUDENT, ACTIONS.CREATE),
  studentValidation.create, 
  validate, 
  addStudent
);

// Students can view their own profile
router.get('/me', 
  protect, 
  authorize('STUDENT'), 
  getMyProfile
);

// Students can upload their own photo
router.post('/me/photo', 
  protect, 
  authorize('STUDENT'), 
  uploadLimiter, 
  upload.single('photo'), 
  uploadProfilePhoto
);

// Admin can view alumni
router.get('/alumni', 
  protect, 
  requirePermission(RESOURCES.ALUMNI, ACTIONS.LIST),
  getAllAlumni
);

// Admin can enroll students in subjects
router.post('/enroll-subject', 
  protect, 
  requirePermission(RESOURCES.SUBJECT, ACTIONS.UPDATE),
  enrollStudentsInSubject
);

// Upload photo for specific student (with ownership check)
router.post('/:id/photo', 
  protect, 
  requirePermission(RESOURCES.STUDENT, ACTIONS.UPDATE),
  checkOwnership, 
  uploadLimiter, 
  upload.single('photo'), 
  uploadProfilePhoto
);

// Admin can mark student as alumni
router.post('/:id/graduate', 
  protect, 
  requirePermission(RESOURCES.STUDENT, ACTIONS.UPDATE),
  markAsAlumni
);

// Update student (with RBAC check)
router.put('/:id', 
  protect, 
  requirePermission(RESOURCES.STUDENT, ACTIONS.UPDATE),
  updateStudent
);

// Count students
router.get('/count',
  protect,
  requirePermission(RESOURCES.STUDENT, ACTIONS.LIST),
  async (req, res) => {
    const Student = require('../models/Student');
    const count = await Student.countDocuments({ isAlumni: { $ne: true } });
    res.json({ success: true, data: { count } });
  }
);

// List all students (with permission-based filtering)
router.get('/', 
  protect, 
  requirePermission(RESOURCES.STUDENT, ACTIONS.LIST),
  applyPermissionFilter(),
  getAllStudents
);

// Get students by department and semester
router.get('/class', 
  protect, 
  requirePermission(RESOURCES.STUDENT, ACTIONS.LIST),
  getStudentsByDepartmentAndSemester
);

module.exports = router;