const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homeworkController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Homework CRUD routes
router.post(
  '/',
  authorize('FACULTY', 'ADMIN'),
  homeworkController.uploadMiddleware.array('attachments', 5),
  homeworkController.createHomework
);

router.get('/', homeworkController.getAllHomework);

router.get('/:id', homeworkController.getHomeworkById);

router.put(
  '/:id',
  authorize('FACULTY', 'ADMIN'),
  homeworkController.updateHomework
);

router.delete(
  '/:id',
  authorize('FACULTY', 'ADMIN'),
  homeworkController.deleteHomework
);

// Submission routes
router.post(
  '/:homeworkId/submit',
  authorize('STUDENT'),
  homeworkController.uploadMiddleware.array('files', 5),
  homeworkController.submitHomework
);

router.get(
  '/:homeworkId/submissions',
  authorize('FACULTY', 'ADMIN'),
  homeworkController.getSubmissions
);

router.get(
  '/submissions/my-submissions',
  authorize('STUDENT'),
  homeworkController.getMySubmissions
);

router.post(
  '/submissions/:submissionId/grade',
  authorize('FACULTY', 'ADMIN'),
  homeworkController.gradeSubmission
);

router.post(
  '/submissions/:submissionId/plagiarism-check',
  authorize('FACULTY', 'ADMIN'),
  homeworkController.runPlagiarismCheck
);

router.get(
  '/submissions/:submissionId/download/:fileIndex',
  homeworkController.downloadSubmissionFile
);

module.exports = router;
