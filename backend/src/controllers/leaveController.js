const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const { sendNotificationToRole } = require('./notificationController');

// @desc    Apply for leave
// @route   POST /api/v1/leaves
// @access  Private/Student
const applyLeave = async (req, res, next) => {
  try {
    const { reason, fromDate, toDate, leaveType } = req.body;

    if (!reason || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        error: 'Reason, fromDate, and toDate are required'
      });
    }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    // Validate dates
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    if (from > to) {
      return res.status(400).json({
        success: false,
        error: 'From date must be before or equal to to date'
      });
    }

    // Check for overlapping leave requests
    const overlapping = await LeaveRequest.findOne({
      student: student._id,
      status: { $ne: 'REJECTED' },
      $or: [
        { fromDate: { $lte: to }, toDate: { $gte: from } }
      ]
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        error: 'You already have a leave request for overlapping dates'
      });
    }

    const leaveRequest = await LeaveRequest.create({
      student: student._id,
      reason,
      leaveType: leaveType || 'OTHER',
      fromDate: from,
      toDate: to,
      status: 'PENDING'
    });

    const populatedLeave = await LeaveRequest.findById(leaveRequest._id)
      .populate({
        path: 'student',
        select: 'usn userId',
        populate: { path: 'userId', select: 'name email' }
      });

    const studentName = populatedLeave.student?.userId?.name || 'A student';
    sendNotificationToRole(
      'FACULTY',
      'New Leave Request',
      `${studentName} has submitted a leave request from ${from.toDateString()} to ${to.toDateString()}.`,
      'LEAVE',
      'HIGH'
    );

    res.status(201).json({
      success: true,
      data: populatedLeave
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my leave requests (student)
// @route   GET /api/v1/leaves/my
// @access  Private/Student
const getMyLeaves = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    const leaves = await LeaveRequest.find({ student: student._id })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending leave requests (for faculty/admin review)
// @route   GET /api/v1/leaves/pending
// @access  Private/Faculty/Admin
const getPendingLeaves = async (req, res, next) => {
  try {
    const leaves = await LeaveRequest.find({ status: 'PENDING' })
      .populate({
        path: 'student',
        select: 'usn userId department semester',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'department', select: 'name code' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all leave requests with optional filters
// @route   GET /api/v1/leaves
// @access  Private/Faculty/Admin
const getAllLeaves = async (req, res, next) => {
  try {
    const { status, studentId, from, to } = req.query;
    
    const query = {};
    if (status) query.status = status.toUpperCase();
    if (studentId) query.student = studentId;
    if (from || to) {
      query.fromDate = {};
      if (from) query.fromDate.$gte = new Date(from);
      if (to) query.fromDate.$lte = new Date(to);
    }

    const leaves = await LeaveRequest.find(query)
      .populate({
        path: 'student',
        select: 'usn userId department semester',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'department', select: 'name code' }
        ]
      })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review leave request (approve/reject)
// @route   PUT /api/v1/leaves/:id/review
// @access  Private/Faculty/Admin
const reviewLeave = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be APPROVED or REJECTED'
      });
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

    if (leave.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Leave request has already been reviewed'
      });
    }

    leave.status = status;
    leave.reviewedBy = req.user.id;
    leave.reviewNote = reviewNote || '';
    await leave.save();

    const populatedLeave = await LeaveRequest.findById(leave._id)
      .populate({
        path: 'student',
        select: 'usn userId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('reviewedBy', 'name');

    res.status(200).json({
      success: true,
      data: populatedLeave
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getPendingLeaves,
  getAllLeaves,
  reviewLeave
};