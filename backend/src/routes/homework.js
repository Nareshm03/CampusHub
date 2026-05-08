const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homeworkController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Homework CRUD routes
router.post(
  '/',
  authorize('faculty', 'admin'),
  homeworkController.uploadMiddleware.array('attachments', 5),
  homeworkController.createHomework
);

router.get('/', homeworkController.getAllHomework);

router.get('/:id', homeworkController.getHomeworkById);

router.put(
  '/:id',
  authorize('faculty', 'admin'),
  homeworkController.updateHomework
);

router.delete(
  '/:id',
  authorize('faculty', 'admin'),
  homeworkController.deleteHomework
);

// Submission routes
router.post(
  '/:homeworkId/submit',
  authorize('student'),
  homeworkController.uploadMiddleware.array('files', 5),
  homeworkController.submitHomework
);

router.get(
  '/:homeworkId/submissions',
  authorize('faculty', 'admin'),
  homeworkController.getSubmissions
);

router.get(
  '/submissions/my-submissions',
  authorize('student'),
  homeworkController.getMySubmissions
);

router.post(
  '/submissions/:submissionId/grade',
  authorize('faculty', 'admin'),
  homeworkController.gradeSubmission
);

router.post(
  '/submissions/:submissionId/plagiarism-check',
  authorize('faculty', 'admin'),
  homeworkController.runPlagiarismCheck
);

router.get(
  '/submissions/:submissionId/download/:fileIndex',
  homeworkController.downloadSubmissionFile
);

module.exports = router;
