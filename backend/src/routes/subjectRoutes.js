const express = require('express');
const {
  createSubject,
  getAllSubjects,
  getSubjectsByDepartment,
  assignFacultyToSubject,
  updateSubject,
  deleteSubject,
  getSubjectsByFaculty,
  getStudentsBySubject,
  bulkAddSubjects,
  removeFacultyFromSubject,
  getSubjectStats,
  searchSubjects
} = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/auth');
const { requirePermission, RESOURCES, ACTIONS } = require('../middleware/rbac');

const router = express.Router();

router.use((req, res, next) => {
  console.log('SubjectRoute hit:', req.method, req.originalUrl, 'User:', req.user ? req.user.email : 'No user');
  next();
});

// Search subjects
router.get('/search',
  protect,
  requirePermission(RESOURCES.SUBJECT, ACTIONS.LIST),
  searchSubjects
);

// Bulk add subjects
router.post('/bulk',
  protect,
  requirePermission(RESOURCES.SUBJECT, ACTIONS.CREATE),
  bulkAddSubjects
);

router
  .route('/')
  .post(protect, requirePermission(RESOURCES.SUBJECT, ACTIONS.CREATE), createSubject)
  .get(protect, requirePermission(RESOURCES.SUBJECT, ACTIONS.LIST), getAllSubjects);

router
  .route('/faculty')
  .get(protect, authorize('FACULTY', 'ADMIN'), getSubjectsByFaculty);

router
  .route('/department/:departmentId')
  .get(protect, getSubjectsByDepartment);

router
  .route('/:id/assign-faculty')
  .put(protect, requirePermission(RESOURCES.SUBJECT, ACTIONS.UPDATE), assignFacultyToSubject);

router
  .route('/:id/remove-faculty')
  .put(protect, requirePermission(RESOURCES.SUBJECT, ACTIONS.UPDATE), removeFacultyFromSubject);

router
  .route('/:id/students')
  .get(protect, authorize('FACULTY', 'ADMIN'), getStudentsBySubject);

router
  .route('/:id/stats')
  .get(protect, authorize('FACULTY', 'ADMIN'), getSubjectStats);

router
  .route('/:id')
  .put(protect, requirePermission(RESOURCES.SUBJECT, ACTIONS.UPDATE), updateSubject)
  .delete(protect, requirePermission(RESOURCES.SUBJECT, ACTIONS.DELETE), deleteSubject);

module.exports = router;