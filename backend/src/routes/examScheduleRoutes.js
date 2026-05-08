const express = require('express');
const router = express.Router();
const examScheduleController = require('../controllers/examScheduleController');
const { protect, authorize } = require('../middleware/auth');
const { requirePermission, RESOURCES, ACTIONS } = require('../middleware/rbac');

// Exam schedule routes
router.post('/',
  protect,
  requirePermission(RESOURCES.EXAM, ACTIONS.CREATE),
  examScheduleController.createExamSchedule
);

router.get('/',
  protect,
  requirePermission(RESOURCES.EXAM, ACTIONS.LIST),
  examScheduleController.getExamSchedules
);

router.get('/:id',
  protect,
  requirePermission(RESOURCES.EXAM, ACTIONS.READ),
  examScheduleController.getExamScheduleById
);

router.put('/:id',
  protect,
  requirePermission(RESOURCES.EXAM, ACTIONS.UPDATE),
  examScheduleController.updateExamSchedule
);

router.delete('/:id',
  protect,
  requirePermission(RESOURCES.EXAM, ACTIONS.DELETE),
  examScheduleController.deleteExamSchedule
);

router.put('/:id/publish',
  protect,
  requirePermission(RESOURCES.EXAM, ACTIONS.UPDATE),
  examScheduleController.publishExamSchedule
);

// Exam registration routes
router.post('/:id/register',
  protect,
  authorize('STUDENT'),
  examScheduleController.registerForExam
);

router.get('/:id/registrations',
  protect,
  requirePermission(RESOURCES.EXAM, ACTIONS.READ),
  examScheduleController.getExamRegistrations
);

// Hall ticket routes
router.put('/registrations/:id/hall-ticket',
  protect,
  requirePermission(RESOURCES.EXAM, ACTIONS.UPDATE),
  examScheduleController.issueHallTicket
);

router.get('/registrations/my-registrations',
  protect,
  authorize('STUDENT'),
  examScheduleController.getMyExamRegistrations
);

module.exports = router;
