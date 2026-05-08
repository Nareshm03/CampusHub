const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const Fee = require('../models/Fee');
const Notice = require('../models/Notice');
const mongoose = require('mongoose');

/**
 * Resolve the linked Student document for the authenticated parent.
 * User.linkedStudentId stores the Student._id (not User._id).
 */
const resolveLinkedStudent = async (parentUserId) => {
  const parent = await User.findById(parentUserId);
  if (!parent || parent.role !== 'PARENT') return null;
  if (!parent.linkedStudentId) return null;

  const student = await Student.findById(parent.linkedStudentId)
    .populate('userId', 'name email')
    .populate('department', 'name code');
  return student;
};

// @desc    Get linked child's profile
// @route   GET /api/parent/child
// @access  Private/Parent
const getChildProfile = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'No linked student found. Contact admin to link your account.'
      });
    }
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// @desc    Get linked child's attendance summary
// @route   GET /api/parent/child/attendance
// @access  Private/Parent
const getChildAttendance = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) return res.status(404).json({ success: false, error: 'No linked student found' });

    const summary = await Attendance.aggregate([
      { $match: { student: student._id } },
      {
        $group: {
          _id: '$subject',
          totalClasses: { $sum: 1 },
          presentClasses: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$presentClasses', '$totalClasses'] }, 100] }, 1]
          }
        }
      },
      {
        $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject' }
      },
      { $unwind: '$subject' },
      { $sort: { percentage: 1 } }
    ]);

    const overall = summary.length > 0
      ? Math.round(summary.reduce((s, r) => s + r.percentage, 0) / summary.length)
      : 0;

    res.status(200).json({ success: true, data: { summary, overall } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get linked child's marks
// @route   GET /api/parent/child/marks
// @access  Private/Parent
const getChildMarks = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) return res.status(404).json({ success: false, error: 'No linked student found' });

    const marks = await Marks.find({ student: student._id })
      .populate('subject', 'name subjectCode semester')
      .sort({ createdAt: -1 });

    // Group by subject — same logic as student marks endpoint
    const subjectMap = {};
    marks.forEach(mark => {
      const sid = mark.subject?._id?.toString();
      if (!sid) return;
      if (!subjectMap[sid]) {
        subjectMap[sid] = {
          subject: mark.subject,
          internal1: 0, internal2: 0, internal3: 0
        };
      }
      if (mark.examType === 'INTERNAL') {
        if (mark.examName === 'Internal 1') subjectMap[sid].internal1 = mark.marks || 0;
        else if (mark.examName === 'Internal 2') subjectMap[sid].internal2 = mark.marks || 0;
        else if (mark.examName === 'Internal 3') subjectMap[sid].internal3 = mark.marks || 0;
      }
      if (mark.internal1 > 0) subjectMap[sid].internal1 = mark.internal1;
      if (mark.internal2 > 0) subjectMap[sid].internal2 = mark.internal2;
      if (mark.internal3 > 0) subjectMap[sid].internal3 = mark.internal3;
    });

    const result = Object.values(subjectMap).map(m => ({
      ...m,
      average: parseFloat(((m.internal1 + m.internal2 + m.internal3) / 3).toFixed(2)),
      status: (m.internal1 + m.internal2 + m.internal3) / 3 >= 20 ? 'SAFE' : 'AT_RISK'
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get linked child's fee records
// @route   GET /api/parent/child/fees
// @access  Private/Parent
const getChildFees = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) return res.status(404).json({ success: false, error: 'No linked student found' });

    const fees = await Fee.find({ student: student._id }).sort({ semester: -1 });
    const totalDue = fees.reduce((s, f) => s + Math.max(0, f.totalAmount - (f.paidAmount || 0)), 0);

    res.status(200).json({ success: true, data: fees, totalDue });
  } catch (error) {
    next(error);
  }
};

// @desc    Get college-wide notices visible to parents
// @route   GET /api/parent/notices
// @access  Private/Parent
const getParentNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find({ targetType: 'COLLEGE' })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, count: notices.length, data: notices });
  } catch (error) {
    next(error);
  }
};

// @desc    Link parent account to a student by USN (self-service)
// @route   POST /api/parent/link-student
// @access  Private/Parent
const linkStudent = async (req, res, next) => {
  try {
    const { usn } = req.body;
    if (!usn) return res.status(400).json({ success: false, error: 'USN is required' });

    const parent = await User.findById(req.user.id);
    if (parent.linkedStudentId) {
      return res.status(400).json({ success: false, error: 'Account is already linked to a student' });
    }

    const student = await Student.findOne({ usn: usn.toUpperCase() })
      .populate('userId', 'name email');
    if (!student) {
      return res.status(404).json({ success: false, error: 'No student found with that USN' });
    }

    parent.linkedStudentId = student._id;
    await parent.save();

    res.status(200).json({
      success: true,
      message: `Account linked to ${student.userId?.name || 'student'} (${student.usn})`,
      data: { studentName: student.userId?.name, usn: student.usn }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get full parent dashboard summary in one call
// @route   GET /api/parent/dashboard
// @access  Private/Parent
const getDashboard = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) {
      return res.status(200).json({
        success: true,
        linked: false,
        data: null
      });
    }

    const [attendanceRaw, marksRaw, fees, notices] = await Promise.all([
      Attendance.aggregate([
        { $match: { student: student._id } },
        {
          $group: {
            _id: '$subject',
            totalClasses: { $sum: 1 },
            presentClasses: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            percentage: {
              $round: [{ $multiply: [{ $divide: ['$presentClasses', '$totalClasses'] }, 100] }, 1]
            }
          }
        },
        { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject' } },
        { $unwind: '$subject' }
      ]),
      Marks.find({ student: student._id }).populate('subject', 'name subjectCode semester'),
      Fee.find({ student: student._id }).sort({ semester: -1 }),
      Notice.find({ targetType: 'COLLEGE' }).sort({ createdAt: -1 }).limit(5).populate('createdBy', 'name')
    ]);

    const overallAttendance = attendanceRaw.length > 0
      ? Math.round(attendanceRaw.reduce((s, r) => s + r.percentage, 0) / attendanceRaw.length)
      : null;

    const atRiskSubjects = attendanceRaw.filter(r => r.percentage < 75);

    // Aggregate marks
    const subjectMap = {};
    marksRaw.forEach(mark => {
      const sid = mark.subject?._id?.toString();
      if (!sid) return;
      if (!subjectMap[sid]) subjectMap[sid] = { subject: mark.subject, internal1: 0, internal2: 0, internal3: 0 };
      if (mark.examType === 'INTERNAL') {
        if (mark.examName === 'Internal 1') subjectMap[sid].internal1 = mark.marks || 0;
        else if (mark.examName === 'Internal 2') subjectMap[sid].internal2 = mark.marks || 0;
        else if (mark.examName === 'Internal 3') subjectMap[sid].internal3 = mark.marks || 0;
      }
      if (mark.internal1 > 0) subjectMap[sid].internal1 = mark.internal1;
      if (mark.internal2 > 0) subjectMap[sid].internal2 = mark.internal2;
      if (mark.internal3 > 0) subjectMap[sid].internal3 = mark.internal3;
    });
    const marksResult = Object.values(subjectMap).map(m => ({
      ...m,
      average: parseFloat(((m.internal1 + m.internal2 + m.internal3) / 3).toFixed(2)),
      status: (m.internal1 + m.internal2 + m.internal3) / 3 >= 20 ? 'SAFE' : 'AT_RISK'
    }));

    const pendingFees = fees.filter(f => f.status !== 'PAID');
    const totalDue = pendingFees.reduce((s, f) => s + Math.max(0, f.totalAmount - (f.paidAmount || 0)), 0);

    res.status(200).json({
      success: true,
      linked: true,
      data: {
        student: {
          name: student.userId?.name,
          email: student.userId?.email,
          usn: student.usn,
          semester: student.semester,
          department: student.department
        },
        attendance: { overall: overallAttendance, subjects: attendanceRaw, atRiskCount: atRiskSubjects.length },
        marks: marksResult,
        fees: { records: fees, totalDue, pendingCount: pendingFees.length },
        notices
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChildProfile,
  getChildAttendance,
  getChildMarks,
  getChildFees,
  getParentNotices,
  linkStudent,
  getDashboard
};
