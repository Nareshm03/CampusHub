const express = require('express');
const {
  getAvailableRooms,
  getMyRoom,
  requestBooking,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
  allocateRoom,
  deallocateRoom,
  getAdminStats,
  getAllHostels,
  createHostel,
  updateHostel,
  deleteHostel,
  addRoom,
  removeRoom
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
router.delete('/allocate', protect, authorize('ADMIN'), deallocateRoom);
router.get('/admin/hostels', protect, authorize('ADMIN'), getAllHostels);
router.post('/admin/hostels', protect, authorize('ADMIN'), createHostel);
router.put('/admin/hostels/:id', protect, authorize('ADMIN'), updateHostel);
router.delete('/admin/hostels/:id', protect, authorize('ADMIN'), deleteHostel);
router.post('/admin/hostels/:id/rooms', protect, authorize('ADMIN'), addRoom);
router.delete('/admin/hostels/:id/rooms/:roomNumber', protect, authorize('ADMIN'), removeRoom);

module.exports = router;
