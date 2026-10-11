const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const alumniController = require('../controllers/alumniController');

const router = express.Router();

router.use(protect);

// Directory reads: intended audience is STUDENT + ADMIN (the only roles
// with network navigation). Gates are enforced here, not in the UI.
router.get('/jobs', authorize('ADMIN', 'STUDENT'), alumniController.getJobPostings);
router.get('/mentors', authorize('ADMIN', 'STUDENT'), alumniController.getMentors);
router.post('/mentors/:mentorId/request', authorize('ADMIN', 'STUDENT'), alumniController.requestMentorship);
router.get('/', authorize('ADMIN', 'STUDENT'), alumniController.getAlumni);

// Writes enforce owner-or-ADMIN inside the controller (server-derived
// identity from the JWT; client ownership fields are never trusted).
router.post('/:id/jobs', alumniController.postJob);
router.put('/:id/mentorship', alumniController.offerMentorship);

module.exports = router;
