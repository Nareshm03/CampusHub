const express = require('express');
const alumniController = require('../controllers/alumniController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/jobs', alumniController.getJobPostings);
router.get('/mentors', alumniController.getMentors);
router.post('/mentors/:mentorId/request', alumniController.requestMentorship);
router.get('/', alumniController.getAlumni);
router.post('/:id/jobs', alumniController.postJob);
router.put('/:id/mentorship', alumniController.offerMentorship);

module.exports = router;