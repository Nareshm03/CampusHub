const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const mongoose = require('mongoose');

const isUsableFilterValue = (v) => v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'undefined' && v !== 'null';

// Build a safe student-scope filter. Faculty callers are restricted to their
// own department; admins may scope freely. Returns { filter } or sends the
// error response and returns null.
const buildStudentFilter = (req, res) => {
  const { department, semester } = req.query;
  const studentFilter = {};

  if (req.user.role === 'FACULTY') {
    if (!req.user.department) {
      res.status(403).json({ success: false, error: 'Faculty department scope unavailable' });
      return null;
    }
    if (isUsableFilterValue(department) && department.toString() !== req.user.department.toString()) {
      res.status(403).json({ success: false, error: 'Access denied. You can only view your department.' });
      return null;
    }
    studentFilter.department = req.user.department;
  } else if (isUsableFilterValue(department)) {
    if (!mongoose.Types.ObjectId.isValid(department)) {
      res.status(400).json({ success: false, error: 'Invalid department ID' });
      return null;
    }
    studentFilter.department = department;
  }

  if (isUsableFilterValue(semester)) {
    const sem = parseInt(semester, 10);
    if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
      res.status(400).json({ success: false, error: 'Invalid semester filter' });
      return null;
    }
    studentFilter.semester = sem;
  }

  return { filter: studentFilter };
};

// Application grading rule (matches CSV import grading).
const gradeForPercentage = (pct) => {
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  return 'F';
};

// @desc    Get attendance report
// @route   GET /api/reports/attendance
// @access  Private/Admin
const getAttendanceReport = async (req, res, next) => {
  try {
    const built = buildStudentFilter(req, res);
    if (!built) return;
    const studentFilter = built.filter;
    
    // Get all students
    const students = await Student.find(studentFilter)
      .populate('userId', 'name email')
      .populate('department', 'name')
      .lean();
    
    const attendanceData = [];
    
    for (const student of students) {
      // Get attendance records for current academic year (last 365 days)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const attendanceRecords = await Attendance.find({ 
        student: student._id,
        date: { $gte: oneYearAgo }
      }).lean();
      
      if (attendanceRecords.length === 0) {
        // No attendance data
        attendanceData.push({
          studentId: student._id,
          studentName: student.userId?.name || 'Unknown',
          usn: student.usn,
          department: student.department?.name || 'Unknown',
          semester: student.semester,
          totalClasses: 0,
          attendedClasses: 0,
          attendancePercentage: 0,
          status: 'No Data'
        });
        continue;
      }
      
      const totalClasses = attendanceRecords.length;
      const attendedClasses = attendanceRecords.filter(a => a.status === 'PRESENT').length;
      const attendancePercentage = (attendedClasses / totalClasses) * 100;
      
      attendanceData.push({
        studentId: student._id,
        studentName: student.userId?.name || 'Unknown',
        usn: student.usn,
        department: student.department?.name || 'Unknown',
        semester: student.semester,
        totalClasses,
        attendedClasses,
        attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
        status: attendancePercentage >= 75 ? 'Good' : attendancePercentage >= 60 ? 'Warning' : 'Low'
      });
    }

    res.status(200).json({
      success: true,
      data: attendanceData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get marks report
// @route   GET /api/reports/marks
// @access  Private/Admin
const getMarksReport = async (req, res, next) => {
  try {
    const { subject } = req.query;
    const built = buildStudentFilter(req, res);
    if (!built) return;
    const studentFilter = built.filter;

    if (isUsableFilterValue(subject) && !mongoose.Types.ObjectId.isValid(subject)) {
      return res.status(400).json({ success: false, error: 'Invalid subject ID' });
    }
    
    // Get all students
    const students = await Student.find(studentFilter)
      .populate('userId', 'name email')
      .populate('department', 'name')
      .lean();
    
    const marksData = [];
    
    for (const student of students) {
      // Build marks filter for current academic year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const marksFilter = {
        student: student._id,
        createdAt: { $gte: oneYearAgo }
      };
      if (isUsableFilterValue(subject)) marksFilter.subject = subject;

      // Get all marks for this student
      const marksRecords = await Marks.find(marksFilter)
        .populate('subject', 'name subjectCode')
        .lean();
      
      if (marksRecords.length === 0) {
        marksData.push({
          studentId: student._id,
          studentName: student.userId?.name || 'Unknown',
          usn: student.usn,
          department: student.department?.name || 'Unknown',
          semester: student.semester,
          subject: 'No Data',
          totalMarks: 0,
          obtainedMarks: 0,
          percentage: 0,
          grade: 'N/A',
          status: 'No Data'
        });
        continue;
      }
      
      // Group by subject and calculate totals
      const subjectMarks = {};
      
      for (const mark of marksRecords) {
        const subjectId = mark.subject?._id?.toString() || 'unknown';
        const subjectName = mark.subject?.name || 'Unknown Subject';
        
        if (!subjectMarks[subjectId]) {
          subjectMarks[subjectId] = {
            subjectName,
            totalMarks: 0,
            obtainedMarks: 0,
            records: []
          };
        }
        
        subjectMarks[subjectId].totalMarks += mark.maxMarks || 0;
        subjectMarks[subjectId].obtainedMarks += mark.marks || 0;
        subjectMarks[subjectId].records.push(mark);
      }
      
      // Create report entry for each subject
      for (const [subjectId, data] of Object.entries(subjectMarks)) {
        const percentage = data.totalMarks > 0 
          ? (data.obtainedMarks / data.totalMarks) * 100 
          : 0;
        
        const grade = gradeForPercentage(percentage);
        
        marksData.push({
          studentId: student._id,
          studentName: student.userId?.name || 'Unknown',
          usn: student.usn,
          department: student.department?.name || 'Unknown',
          semester: student.semester,
          subject: data.subjectName,
          totalMarks: data.totalMarks,
          obtainedMarks: data.obtainedMarks,
          percentage: parseFloat(percentage.toFixed(2)),
          grade,
          status: percentage >= 40 ? 'Pass' : 'Low Marks'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: marksData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendanceReport,
  getMarksReport
};