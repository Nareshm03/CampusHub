const Hostel = require('../models/Hostel');
const HostelBooking = require('../models/HostelBooking');
const Student = require('../models/Student');

// ─── Student: Get available rooms (with filters) ─────────────────────────────

// @route   GET /api/hostel/rooms/available
// @access  Private
const getAvailableRooms = async (req, res, next) => {
  try {
    const { type, minRent, maxRent, capacity, sortBy = 'rent', order = 'asc' } = req.query;

    const hostelFilter = {};
    if (type) hostelFilter.type = type.toUpperCase();

    const hostels = await Hostel.find(hostelFilter);

    let rooms = hostels.flatMap(hostel =>
      hostel.rooms
        .filter(room => room.occupants.length < room.capacity)
        .map(room => ({
          hostelId: hostel._id,
          hostelName: hostel.name,
          hostelType: hostel.type,
          roomNumber: room.number,
          capacity: room.capacity,
          availableSpots: room.capacity - room.occupants.length,
          occupants: room.occupants.length,
          rent: room.rent,
          facilities: room.facilities || []
        }))
    );

    // Filters
    if (minRent) rooms = rooms.filter(r => r.rent >= Number(minRent));
    if (maxRent) rooms = rooms.filter(r => r.rent <= Number(maxRent));
    if (capacity) rooms = rooms.filter(r => r.capacity === Number(capacity));

    // Sort
    const dir = order === 'desc' ? -1 : 1;
    const sortMap = { rent: 'rent', capacity: 'capacity', available: 'availableSpots' };
    const field = sortMap[sortBy] || 'rent';
    rooms.sort((a, b) => (a[field] - b[field]) * dir);

    res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
};

// ─── Student: Get my room / booking ──────────────────────────────────────────

// @route   GET /api/hostel/my-room
// @access  Private/Student
const getMyRoom = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ success: false, error: 'Student profile not found' });

    // Check active booking first
    const booking = await HostelBooking.findOne({
      student: student._id,
      status: { $in: ['PENDING', 'APPROVED', 'CHECKED_IN'] }
    }).populate('hostel', 'name type mess');

    if (booking) {
      return res.status(200).json({ success: true, type: 'booking', data: booking });
    }

    // Fall back to legacy direct allocation
    const hostel = await Hostel.findOne({ 'rooms.occupants': student._id })
      .populate({ path: 'rooms.occupants', select: 'usn userId', populate: { path: 'userId', select: 'name email' } });

    if (!hostel) {
      return res.status(404).json({ success: false, error: 'No room allocated' });
    }

    const room = hostel.rooms.find(r =>
      r.occupants.some(o => o._id.toString() === student._id.toString())
    );

    res.status(200).json({
      success: true,
      type: 'allocated',
      data: {
        hostelName: hostel.name,
        roomNumber: room.number,
        roommates: room.occupants.filter(o => o._id.toString() !== student._id.toString()),
        rent: room.rent,
        messMenu: hostel.mess?.menu || []
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Student: Submit booking request ─────────────────────────────────────────

// @route   POST /api/hostel/book
// @access  Private/Student
const requestBooking = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ success: false, error: 'Student profile not found' });

    // Check for existing active booking
    const existing = await HostelBooking.findOne({
      student: student._id,
      status: { $in: ['PENDING', 'APPROVED', 'CHECKED_IN'] }
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You already have an active booking or request' });
    }

    const { hostelId, roomNumber, moveInDate, checkOutDate, preferences } = req.body;

    const moveIn = moveInDate ? new Date(moveInDate) : null;
    const checkOut = checkOutDate ? new Date(checkOutDate) : null;
    if (!moveIn || Number.isNaN(moveIn.getTime()) || !checkOut || Number.isNaN(checkOut.getTime())) {
      return res.status(400).json({ success: false, error: 'Valid moveInDate and checkOutDate are required' });
    }
    if (checkOut <= moveIn) {
      return res.status(400).json({ success: false, error: 'checkOutDate must be after moveInDate' });
    }

    // Validate room exists and has space
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ success: false, error: 'Hostel not found' });

    const room = hostel.rooms.find(r => r.number === roomNumber);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({ success: false, error: 'Room is fully occupied' });
    }

    const booking = await HostelBooking.create({
      student: student._id,
      hostel: hostelId,
      roomNumber,
      moveInDate: moveIn,
      checkOutDate: checkOut,
      preferences: preferences || {}
    });

    const populated = await HostelBooking.findById(booking._id).populate('hostel', 'name type');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── Student: Cancel own booking ─────────────────────────────────────────────

// A booking is cancellable only before check-in. Terminal states
// (CHECKED_OUT / REJECTED / CANCELLED) are history and must not be
// rewritten; CHECKED_IN requires admin handling (deallocation first).
// @route   PUT /api/hostel/booking/:bookingId/cancel
// @access  Private/Student
const cancelBooking = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ success: false, error: 'Student profile not found' });
    const booking = await HostelBooking.findOne({
      _id: req.params.bookingId,
      student: student._id
    });

    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.status === 'CHECKED_IN') {
      return res.status(400).json({ success: false, error: 'Cannot cancel a checked-in booking. Contact admin.' });
    }
    if (!['PENDING', 'APPROVED'].includes(booking.status)) {
      return res.status(400).json({ success: false, error: `Cannot cancel a ${booking.status} booking` });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Get all bookings ──────────────────────────────────────────────────

// @route   GET /api/hostel/admin/bookings
// @access  Private/Admin
const getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const [bookings, total] = await Promise.all([
      HostelBooking.find(filter)
        .populate({ path: 'student', populate: { path: 'userId', select: 'name email' } })
        .populate('hostel', 'name type')
        .populate('allocatedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      HostelBooking.countDocuments(filter)
    ]);

    res.status(200).json({ success: true, total, data: bookings });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Approve / reject booking ─────────────────────────────────────────

// Allowed lifecycle: PENDING → APPROVED | REJECTED, APPROVED → CHECKED_IN |
// REJECTED, CHECKED_IN → CHECKED_OUT. Terminal states (CHECKED_OUT,
// REJECTED, CANCELLED) never transition — history stays truthful.
// @route   PUT /api/hostel/admin/bookings/:bookingId
// @access  Private/Admin
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const allowed = ['APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const booking = await HostelBooking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    // Allowed lifecycle: PENDING → APPROVED | REJECTED | CHECKED_IN
    // (direct check-in is an asserted admin fast-path), APPROVED →
    // CHECKED_IN | REJECTED, CHECKED_IN → CHECKED_OUT. Terminal states
    // (CHECKED_OUT, REJECTED, CANCELLED) never transition — history stays
    // truthful.
    const TRANSITIONS = {
      PENDING: ['APPROVED', 'REJECTED', 'CHECKED_IN'],
      APPROVED: ['CHECKED_IN', 'REJECTED'],
      CHECKED_IN: ['CHECKED_OUT'],
      CHECKED_OUT: [],
      REJECTED: [],
      CANCELLED: []
    };
    const from = booking.status;
    if (!(TRANSITIONS[from] || []).includes(status)) {
      return res.status(400).json({ success: false, error: `Cannot move booking from ${from} to ${status}` });
    }

    booking.status = status;
    if (adminNote) booking.adminNote = adminNote;

    if (status === 'APPROVED' || status === 'CHECKED_IN') {
      booking.allocatedBy = req.user.id;
      booking.allocatedAt = new Date();

      // Add student to room occupants when checked in (capacity enforced,
      // duplicates compared by id string since these are ObjectId instances).
      // Occupancy is global: a student occupant in ANY hostel blocks a new
      // check-in, otherwise cross-hostel double occupancy is possible.
      if (status === 'CHECKED_IN') {
        const occupied = await Hostel.exists({ 'rooms.occupants': booking.student });
        if (occupied) {
          return res.status(400).json({ success: false, error: 'Student is already allocated to a room' });
        }
        const hostel = await Hostel.findById(booking.hostel);
        const room = hostel?.rooms.find(r => r.number === booking.roomNumber);
        if (!room) {
          return res.status(400).json({ success: false, error: 'Booked room no longer exists' });
        }
        if (!room.occupants.some(o => o.toString() === booking.student.toString())) {
          if (room.occupants.length >= room.capacity) {
            return res.status(400).json({ success: false, error: 'Room is fully occupied' });
          }
          room.occupants.push(booking.student);
          await hostel.save();
        }
      }
    }

    if (status === 'CHECKED_OUT') {
      // Remove from room occupants
      const hostel = await Hostel.findById(booking.hostel);
      const room = hostel?.rooms.find(r => r.number === booking.roomNumber);
      if (room) {
        room.occupants = room.occupants.filter(o => o.toString() !== booking.student.toString());
        await hostel.save();
      }
    }

    await booking.save();
    const updated = await HostelBooking.findById(booking._id)
      .populate({ path: 'student', populate: { path: 'userId', select: 'name email' } })
      .populate('hostel', 'name type');

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Allocate room directly ───────────────────────────────────────────

// @route   POST /api/hostel/allocate
// @access  Private/Admin
const allocateRoom = async (req, res, next) => {
  try {
    const { hostelId, roomNumber, studentId } = req.body;

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(hostelId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, error: 'Valid hostelId and studentId are required' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ success: false, error: 'Hostel not found' });

    const room = hostel.rooms.find(r => r.number === roomNumber);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    const alreadyHere = room.occupants.some(o => o.toString() === studentId.toString());
    if (alreadyHere) {
      return res.status(400).json({ success: false, error: 'Student is already allocated to this room' });
    }
    // Global occupancy: block allocation when the student occupies any room
    // in any hostel (same-hostel check alone allowed cross-hostel doubles).
    const occupiedAnywhere = await Hostel.exists({ 'rooms.occupants': student._id });
    if (occupiedAnywhere) {
      return res.status(400).json({ success: false, error: 'Student is already allocated to a room' });
    }
    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({ success: false, error: 'Room is fully occupied' });
    }

    room.occupants.push(studentId);
    await hostel.save();

    res.status(200).json({ success: true, message: 'Room allocated successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Dashboard stats ───────────────────────────────────────────────────

// @route   GET /api/hostel/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res, next) => {
  try {
    const [hostels, bookingCounts] = await Promise.all([
      Hostel.find(),
      HostelBooking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const totalRooms = hostels.reduce((s, h) => s + h.rooms.length, 0);
    const totalCapacity = hostels.reduce((s, h) => s + h.rooms.reduce((rs, r) => rs + r.capacity, 0), 0);
    const totalOccupied = hostels.reduce((s, h) => s + h.rooms.reduce((rs, r) => rs + r.occupants.length, 0), 0);

    const statusMap = {};
    bookingCounts.forEach(b => { statusMap[b._id] = b.count; });

    res.status(200).json({
      success: true,
      data: {
        totalRooms,
        totalCapacity,
        totalOccupied,
        availableSpots: totalCapacity - totalOccupied,
        occupancyRate: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
        bookings: {
          pending: statusMap['PENDING'] || 0,
          approved: statusMap['APPROVED'] || 0,
          checkedIn: statusMap['CHECKED_IN'] || 0,
          checkedOut: statusMap['CHECKED_OUT'] || 0,
          cancelled: statusMap['CANCELLED'] || 0,
          rejected: statusMap['REJECTED'] || 0
        },
        hostels: hostels.map(h => ({
          id: h._id,
          name: h.name,
          type: h.type,
          rooms: h.rooms.length,
          capacity: h.rooms.reduce((s, r) => s + r.capacity, 0),
          occupied: h.rooms.reduce((s, r) => s + r.occupants.length, 0)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Hostel CRUD ───────────────────────────────────────────────────────

// @route   GET /api/hostel/admin/hostels
// @access  Private/Admin
const getAllHostels = async (req, res, next) => {
  try {
    const hostels = await Hostel.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: hostels.length, data: hostels });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/hostel/admin/hostels
// @access  Private/Admin
const createHostel = async (req, res, next) => {
  try {
    const { name, type, rooms = [], mess } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'name and type (BOYS/GIRLS) are required' });
    }
    if (type !== 'BOYS' && type !== 'GIRLS') {
      return res.status(400).json({ success: false, error: 'type must be BOYS or GIRLS' });
    }
    const numbers = rooms.map((r) => r && r.number).filter(Boolean);
    if (new Set(numbers).size !== numbers.length) {
      return res.status(400).json({ success: false, error: 'Room numbers must be unique within a hostel' });
    }
    for (const room of rooms) {
      if (!room.number || room.rent === undefined || room.rent === null) {
        return res.status(400).json({ success: false, error: 'Each room needs number and rent' });
      }
      if (room.capacity !== undefined && (room.capacity < 1 || room.capacity > 10)) {
        return res.status(400).json({ success: false, error: 'Room capacity must be between 1 and 10' });
      }
    }
    const hostel = await Hostel.create({ name, type, rooms, mess });
    res.status(201).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/hostel/admin/hostels/:id
// @access  Private/Admin
const updateHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, error: 'Hostel not found' });
    const { name, type, mess } = req.body;
    if (name !== undefined) hostel.name = name;
    if (type !== undefined) {
      if (type !== 'BOYS' && type !== 'GIRLS') {
        return res.status(400).json({ success: false, error: 'type must be BOYS or GIRLS' });
      }
      hostel.type = type;
    }
    if (mess !== undefined) hostel.mess = mess;
    await hostel.save();
    res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/hostel/admin/hostels/:id
// @access  Private/Admin
const deleteHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, error: 'Hostel not found' });
    if (hostel.rooms.some((r) => r.occupants.length > 0)) {
      return res.status(400).json({ success: false, error: 'Cannot delete a hostel with occupied rooms' });
    }
    const activeBookings = await HostelBooking.countDocuments({
      hostel: hostel._id,
      status: { $in: ['PENDING', 'APPROVED', 'CHECKED_IN'] }
    });
    if (activeBookings > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete a hostel with active bookings' });
    }
    await hostel.deleteOne();
    res.status(200).json({ success: true, message: 'Hostel deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/hostel/admin/hostels/:id/rooms
// @access  Private/Admin
const addRoom = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, error: 'Hostel not found' });
    const { number, capacity = 2, rent, facilities = [] } = req.body;
    if (!number || rent === undefined || rent === null) {
      return res.status(400).json({ success: false, error: 'Room number and rent are required' });
    }
    if (hostel.rooms.some((r) => r.number === number)) {
      return res.status(400).json({ success: false, error: 'Room number already exists in this hostel' });
    }
    if (capacity < 1 || capacity > 10) {
      return res.status(400).json({ success: false, error: 'Room capacity must be between 1 and 10' });
    }
    hostel.rooms.push({ number, capacity, rent, facilities, occupants: [] });
    await hostel.save();
    res.status(201).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/hostel/admin/hostels/:id/rooms/:roomNumber
// @access  Private/Admin
const removeRoom = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, error: 'Hostel not found' });
    const room = hostel.rooms.find((r) => r.number === req.params.roomNumber);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    if (room.occupants.length > 0) {
      return res.status(400).json({ success: false, error: 'Cannot remove an occupied room' });
    }
    hostel.rooms = hostel.rooms.filter((r) => r.number !== req.params.roomNumber);
    await hostel.save();
    res.status(200).json({ success: true, message: 'Room removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/hostel/allocate (ADMIN direct deallocation)
// @access  Private/Admin
const deallocateRoom = async (req, res, next) => {
  try {
    const { hostelId, roomNumber, studentId } = req.body;
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(hostelId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, error: 'Valid hostelId and studentId are required' });
    }
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ success: false, error: 'Hostel not found' });
    const room = hostel.rooms.find((r) => r.number === roomNumber);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    const before = room.occupants.length;
    room.occupants = room.occupants.filter((o) => o.toString() !== studentId.toString());
    if (room.occupants.length === before) {
      return res.status(404).json({ success: false, error: 'Student is not allocated to this room' });
    }
    await hostel.save();
    res.status(200).json({ success: true, message: 'Student deallocated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
