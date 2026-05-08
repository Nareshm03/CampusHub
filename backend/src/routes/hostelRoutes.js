const express = require('express');
const {
  getAvailableRooms,
  getMyRoom,
  requestBooking,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
  allocateRoom,
  getAdminStats
} = require('../controllers/hostelController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Student routes
router.get('/rooms/available', protect, getAvailableRooms);
router.get('/my-room', protect, authorize('STUDENT'), getMyRoom);
router.post('/book', protect, authorize('STUDENT'), requestBooking);
router.put('/booking/:bookingId/cancel', protect, authorize('STUDENT'), cancelBooking);

// Admin routes
router.get('/admin/stats', protect, authorize('ADMIN'), getAdminStats);
router.get('/admin/bookings', protect, authorize('ADMIN'), getAllBookings);
router.put('/admin/bookings/:bookingId', protect, authorize('ADMIN'), updateBookingStatus);
router.post('/allocate', protect, authorize('ADMIN'), allocateRoom);

module.exports = router;
