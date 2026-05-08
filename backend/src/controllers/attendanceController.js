const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');
const AuditLogger = require('../utils/auditLogger');

// @desc    Check attendance threshold and send notification
const checkAttendanceThreshold = async (studentId, subjectId) => {
  try {
    const student = await Student.findById(studentId).populate('userId');
    const subject = await Subject.findById(subjectId);
    
    const records = await Attendance.find({ student: studentId, subject: subjectId });
    if (records.length < 5) return; // Only check after a few classes

    const totalClasses = records.length;
    const presentClasses = records.filter(r => r.status === 'PRESENT').length;
    const percentage = (presentClasses / totalClasses) * 100;

    const THRESHOLD = 75;

    if (percentage < THRESHOLD) {
      // Check if a warning was already sent today to avoid spam
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingNotif = await Notification.findOne({
        recipient: student.userId._id,
        type: 'ATTENDANCE',
        createdAt: { $gte: today },
        title: { $regex: subject.name, $options: 'i' }
      });

      if (!existingNotif) {
        const { getIO } = require('../config/socket');

        // Notify the student
        const studentNotif = await Notification.create({
          recipient: student.userId._id,
          title: `Low Attendance Warning: ${subject.name}`,
          message: `Your attendance in ${subject.name} is ${percentage.toFixed(2)}%, which is below the required ${THRESHOLD}%.`,
          type: 'ATTENDANCE',
          priority: 'HIGH'
        });
        try { getIO().to(student.userId._id.toString()).emit('new_notification', studentNotif); } catch (_) {}

        // Notify all faculty
        const facultyUsers = await User.find({ role: 'FACULTY' }).select('_id');
        for (const faculty of facultyUsers) {
          const facultyNotif = await Notification.create({
            recipient: faculty._id,
            title: `Low Attendance Alert: ${student.userId.name || 'Student'}`,
            message: `${student.userId.name || 'A student'} (${student.usn}) has ${percentage.toFixed(2)}% attendance in ${subject.name}, below the ${THRESHOLD}% threshold.`,
            type: 'ATTENDANCE',
            priority: 'HIGH'
          });
          try { getIO().to(faculty._id.toString()).emit('new_notification', facultyNotif); } catch (_) {}
        }
      }
    }
  } catch (error) {
    console.error('Error checking attendance threshold:', error);
  }
};

// @desc    Mark attendance for multiple students
// @route   POST /api/attendance/mark
// @access  Private/Faculty
const markAttendance = async (req, res, next) => {
  try {
    const { attendance } = req.body;
    
    if (!attendance || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        error: 'Attendance data must be an array'
      });
    }

    const results = [];
    
    for (const record of attendance) {
      const { studentId, subjectId, date, status } = record;
      
      const existingAttendance = await Attendance.findOne({
        student: studentId,
        subject: subjectId,
        date: new Date(date)
      });

      if (existingAttendance) {
        const beforeStatus = existingAttendance.status;
        existingAttendance.status = status;
        existingAttendance.markedBy = req.user.id;
        await existingAttendance.save();
        results.push(existingAttendance);
        
        // Audit log for attendance update
        await AuditLogger.logAttendanceAction('ATTENDANCE_UPDATED', req.user, {
          entityId: existingAttendance._id,
          affectedUser: studentId,
          subject: subjectId,
          changes: {
            before: { status: beforeStatus, date },
            after: { status, date }
          },
          req
        });
      } else {
        const newAttendance = await Attendance.create({
          student: studentId,
          subject: subjectId,
          date: new Date(date),
          status,
          markedBy: req.user.id
        });
        results.push(newAttendance);
        
        // Audit log for new attendance
        await AuditLogger.logAttendanceAction('ATTENDANCE_MARKED', req.user, {
          entityId: newAttendance._id,
          affectedUser: studentId,
          subject: subjectId,
          changes: {
            after: { status, date }
          },
          req
        });
      }
      
      // Async threshold check
      checkAttendanceThreshold(studentId, subjectId);
    }

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res, next) => {
  try {
    const { subjectId, date, studentId } = req.query;
    
    let query = {};
    if (subjectId) query.subject = subjectId;
    if (date) query.date = new Date(date);
    if (studentId) query.student = studentId;

    const attendance = await Attendance.find(query)
      .populate('student', 'usn userId')
      .populate({
        path: 'student',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate('subject', 'name subjectCode')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance summary for student
// @route   GET /api/attendance/summary/:studentId
// @access  Private
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    const summary = await Attendance.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId) } },
      {
        $group: {
          _id: '$subject',
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          percentage: {
            $multiply: [
              { $divide: ['$presentClasses', '$totalClasses'] },
              100
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: '_id',
          as: 'subject'
        }
      },
      { $unwind: '$subject' }
    ]);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance trends for student
// @route   GET /api/attendance/trends/:studentId
// @access  Private
const getAttendanceTrends = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { period = 'month' } = req.query; // period can be 'week' or 'month'

    let groupBy;
    if (period === 'week') {
      groupBy = {
        $dateToString: { format: '%Y-W%V', date: '$date' }
      };
    } else {
      groupBy = {
        $dateToString: { format: '%Y-%m', date: '$date' }
      };
    }

    const trends = await Attendance.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId) } },
      {
        $group: {
          _id: groupBy,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          percentage: { $multiply: [{ $divide: ['$present', '$total'] }, 100] }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed attendance records for student
// @route   GET /api/attendance/student/:studentId
// @access  Private
const getStudentAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    const attendance = await Attendance.find({ student: studentId })
      .populate('subject', 'name code')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  getAttendance,
  getAttendanceSummary,
  getAttendanceTrends,
  getStudentAttendance
};
