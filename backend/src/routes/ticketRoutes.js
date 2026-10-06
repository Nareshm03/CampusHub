const express = require('express');
const ticketController = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', ticketController.createTicket);
router.get('/', authorize('ADMIN'), ticketController.getTickets);
router.get('/my', ticketController.getMyTickets);
router.put('/:id', ticketController.updateTicket);
router.post('/:id/comments', ticketController.addComment);

module.exports = router;