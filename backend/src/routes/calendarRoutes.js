const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCalendars,
  getCurrentCalendar,
  getCalendarById,
  getUpcomingEvents,
  getEventsByType,
  createCalendar,
  updateCalendar,
  addEvent,
  updateEvent,
  deleteEvent,
  deleteCalendar
} = require('../controllers/calendarController');

// Apply authentication to all routes
router.use(protect);

// Public calendar routes
router.get('/', getCalendars);
router.get('/current', getCurrentCalendar);
router.get('/events/upcoming', getUpcomingEvents);
router.get('/events/type/:type', getEventsByType);
router.get('/:id', getCalendarById);

// Admin calendar routes
router.post('/', createCalendar);
router.put('/:id', updateCalendar);
router.delete('/:id', deleteCalendar);

// Event management
router.post('/:id/events', addEvent);
router.put('/:id/events/:eventId', updateEvent);
router.delete('/:id/events/:eventId', deleteEvent);

module.exports = router;
