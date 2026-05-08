const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/auth');
const { requirePermission, RESOURCES, ACTIONS } = require('../middleware/rbac');
const upload = require('../utils/upload');

// Assignment routes
router.post('/',
  protect,
  requirePermission(RESOURCES.HOMEWORK, ACTIONS.CREATE),
  assignmentController.createAssignment
);

router.get('/',
  protect,
  requirePermission(RESOURCES.HOMEWORK, ACTIONS.LIST),
  assignmentController.getAssignments
);

// Static routes BEFORE /:id to avoid shadowing
router.get('/my-submissions',
  protect,
  authorize('STUDENT'),
  assignmentController.getMySubmissions
);

router.get('/upcoming-deadlines',
  protect,
  authorize('STUDENT'),
  assignmentController.getUpcomingDeadlines
);

router.get('/:id',
  protect,
  requirePermission(RESOURCES.HOMEWORK, ACTIONS.READ),
  assignmentController.getAssignmentById
);

router.put('/:id',
  protect,
  requirePermission(RESOURCES.HOMEWORK, ACTIONS.UPDATE),
  assignmentController.updateAssignment
);

router.delete('/:id',
  protect,
  requirePermission(RESOURCES.HOMEWORK, ACTIONS.DELETE),
  assignmentController.deleteAssignment
);

router.post('/:id/upload',
  protect,
  requirePermission(RESOURCES.HOMEWORK, ACTIONS.UPDATE),
  upload.array('files', 5),
  assignmentController.uploadAssignmentFiles
);

// Assignment submissions
router.post('/:id/submit',
  protect,
  authorize('STUDENT'),
  upload.array('files', 5),
  assignmentController.submitAssignment
);

router.get('/:id/submissions',
  protect,
  requirePermission(RESOURCES.HOMEWORK, ACTIONS.READ),
  assignmentController.getAssignmentSubmissions
);

router.put('/submissions/:id/grade',
  protect,
  requirePermission(RESOURCES.HOMEWORK, ACTIONS.UPDATE),
  assignmentController.gradeSubmission
);

module.exports = router;
