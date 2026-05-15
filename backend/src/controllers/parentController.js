const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const Fee = require('../models/Fee');
const Notice = require('../models/Notice');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const ExamSchedule = require('../models/ExamSchedule');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

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

    // Calculate overall attendance using weighted method (total present / total classes)
    const totalPresent = summary.reduce((sum, r) => sum + r.presentClasses, 0);
    const totalClasses = summary.reduce((sum, r) => sum + r.totalClasses, 0);
    const overall = totalClasses > 0
      ? Math.round((totalPresent / totalClasses) * 100)
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

    // Calculate overall attendance using weighted method (total present / total classes)
    const totalPresent = attendanceRaw.reduce((sum, r) => sum + r.presentClasses, 0);
    const totalClasses = attendanceRaw.reduce((sum, r) => sum + r.totalClasses, 0);
    const overallAttendance = totalClasses > 0
      ? Math.round((totalPresent / totalClasses) * 100)
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

// @desc    Get detailed attendance with date range filter
// @route   GET /api/parent/child/attendance/detailed
// @access  Private/Parent
const getDetailedAttendance = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) return res.status(404).json({ success: false, error: 'No linked student found' });

    const { startDate, endDate, subject } = req.query;
    const filter = { student: student._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (subject) filter.subject = subject;

    const records = await Attendance.find(filter)
      .populate('subject', 'name subjectCode')
      .sort({ date: -1 })
      .limit(500);

    const stats = {
      total: records.length,
      present: records.filter(r => r.status === 'PRESENT').length,
      absent: records.filter(r => r.status === 'ABSENT').length,
      late: records.filter(r => r.status === 'LATE').length,
      percentage: records.length > 0 ? Math.round((records.filter(r => r.status === 'PRESENT').length / records.length) * 100) : 0
    };

    res.status(200).json({ success: true, data: { records, stats } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get CGPA and semester-wise performance
// @route   GET /api/parent/child/cgpa
// @access  Private/Parent
const getChildCGPA = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) return res.status(404).json({ success: false, error: 'No linked student found' });

    const marks = await Marks.find({ student: student._id, examType: 'SEMESTER' })
      .populate('subject', 'name subjectCode semester credits')
      .sort({ createdAt: -1 });

    const semesterMap = {};
    marks.forEach(mark => {
      const sem = mark.subject?.semester || mark.semester || 1;
      if (!semesterMap[sem]) semesterMap[sem] = [];
      semesterMap[sem].push(mark);
    });

    const semesterResults = Object.keys(semesterMap).map(sem => {
      const semMarks = semesterMap[sem];
      const totalCredits = semMarks.reduce((sum, m) => sum + (m.subject?.credits || 3), 0);
      const weightedGrade = semMarks.reduce((sum, m) => {
        const percentage = (m.marks / m.totalMarks) * 100;
        const gradePoint = percentage >= 90 ? 10 : percentage >= 80 ? 9 : percentage >= 70 ? 8 : percentage >= 60 ? 7 : percentage >= 50 ? 6 : percentage >= 40 ? 5 : 0;
        return sum + (gradePoint * (m.subject?.credits || 3));
      }, 0);
      const sgpa = totalCredits > 0 ? (weightedGrade / totalCredits).toFixed(2) : 0;
      return { semester: sem, sgpa: parseFloat(sgpa), subjects: semMarks.length };
    });

    const cgpa = semesterResults.length > 0
      ? (semesterResults.reduce((sum, s) => sum + parseFloat(s.sgpa), 0) / semesterResults.length).toFixed(2)
      : 0;

    res.status(200).json({ success: true, data: { cgpa: parseFloat(cgpa), semesters: semesterResults } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assignments and deadlines
// @route   GET /api/parent/child/assignments
// @access  Private/Parent
const getChildAssignments = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) return res.status(404).json({ success: false, error: 'No linked student found' });

    const assignments = await Assignment.find({
      department: student.department,
      semester: student.semester,
      status: { $in: ['PUBLISHED', 'GRADED'] }
    })
      .populate('subject', 'name subjectCode')
      .populate('faculty', 'name')
      .sort({ dueDate: -1 })
      .limit(50);

    const submissions = await AssignmentSubmission.find({
      student: student._id,
      assignment: { $in: assignments.map(a => a._id) }
    });

    const submissionMap = {};
    submissions.forEach(sub => {
      submissionMap[sub.assignment.toString()] = sub;
    });

    const result = assignments.map(assignment => ({
      ...assignment.toObject(),
      submission: submissionMap[assignment._id.toString()] || null,
      isOverdue: new Date() > assignment.dueDate && !submissionMap[assignment._id.toString()]
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam schedules
// @route   GET /api/parent/child/exams
// @access  Private/Parent
const getChildExams = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) return res.status(404).json({ success: false, error: 'No linked student found' });

    const exams = await ExamSchedule.find({
      department: student.department,
      semester: student.semester,
      status: { $in: ['PUBLISHED', 'ONGOING', 'COMPLETED'] }
    })
      .populate('subjects.subject', 'name subjectCode')
      .sort({ startDate: -1 })
      .limit(10);

    res.status(200).json({ success: true, data: exams });
  } catch (error) {
    next(error);
  }
};

// @desc    Export attendance report as PDF
// @route   GET /api/parent/child/attendance/export
// @access  Private/Parent
const exportAttendanceReport = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) return res.status(404).json({ success: false, error: 'No linked student found' });

    const { startDate, endDate } = req.query;
    const filter = { student: student._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filter)
      .populate('subject', 'name subjectCode')
      .sort({ date: -1 });

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
          percentage: { $round: [{ $multiply: [{ $divide: ['$presentClasses', '$totalClasses'] }, 100] }, 1] }
        }
      },
      { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject' } },
      { $unwind: '$subject' }
    ]);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${student.usn}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Student: ${student.userId?.name || 'N/A'}`);
    doc.text(`USN: ${student.usn}`);
    doc.text(`Department: ${student.department?.name || 'N/A'}`);
    doc.text(`Semester: ${student.semester}`);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(14).text('Subject-wise Summary', { underline: true });
    doc.moveDown(0.5);
    summary.forEach(s => {
      doc.fontSize(10).text(`${s.subject.name}: ${s.presentClasses}/${s.totalClasses} (${s.percentage}%)`);
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Export performance report as PDF
// @route   GET /api/parent/child/performance/export
// @access  Private/Parent
const exportPerformanceReport = async (req, res, next) => {
  try {
    const student = await resolveLinkedStudent(req.user.id);
    if (!student) return res.status(404).json({ success: false, error: 'No linked student found' });

    const marks = await Marks.find({ student: student._id })
      .populate('subject', 'name subjectCode semester')
      .sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=performance-report-${student.usn}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Academic Performance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Student: ${student.userId?.name || 'N/A'}`);
    doc.text(`USN: ${student.usn}`);
    doc.text(`Department: ${student.department?.name || 'N/A'}`);
    doc.text(`Semester: ${student.semester}`);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(14).text('Marks Summary', { underline: true });
    doc.moveDown(0.5);
    marks.forEach(m => {
      doc.fontSize(10).text(`${m.subject?.name || 'Subject'} - ${m.examType} ${m.examName || ''}: ${m.marks}/${m.totalMarks}`);
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Get total parents count (Admin only)
// @route   GET /api/parent/count
// @access  Private/Admin
const getParentsCount = async (req, res, next) => {
  try {
    const count = await User.countDocuments({ role: 'PARENT' });
    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all parents (Admin only)
// @route   GET /api/parent/all
// @access  Private/Admin
const getAllParents = async (req, res, next) => {
  try {
    const parents = await User.find({ role: 'PARENT' })
      .populate('linkedStudentId')
      .select('-password')
      .sort({ createdAt: -1 });
    
    const result = await Promise.all(parents.map(async (parent) => {
      if (parent.linkedStudentId) {
        const student = await Student.findById(parent.linkedStudentId)
          .populate('userId', 'name')
          .populate('department', 'name');
        return {
          ...parent.toObject(),
          studentDetails: student ? {
            name: student.userId?.name,
            usn: student.usn,
            department: student.department?.name,
            semester: student.semester
          } : null
        };
      }
      return parent.toObject();
    }));

    res.status(200).json({ success: true, count: result.length, data: result });
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
  getDashboard,
  getDetailedAttendance,
  getChildCGPA,
  getChildAssignments,
  getChildExams,
  exportAttendanceReport,
  exportPerformanceReport,
  getParentsCount,
  getAllParents
};
