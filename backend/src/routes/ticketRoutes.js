const express = require('express');
const ticketController = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', ticketController.createTicket);
router.get('/', ticketController.getTickets);
router.get('/my', ticketController.getMyTickets);
router.put('/:id', ticketController.updateTicket);
router.post('/:id/comments', ticketController.addComment);

module.exports = router;