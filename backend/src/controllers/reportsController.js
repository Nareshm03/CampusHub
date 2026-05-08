const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');

// @desc    Get attendance report
// @route   GET /api/reports/attendance
// @access  Private/Admin
const getAttendanceReport = async (req, res, next) => {
  try {
    const { department, semester } = req.query;
    
    // Build filter
    const studentFilter = {};
    if (department) studentFilter.department = department;
    if (semester) studentFilter.semester = parseInt(semester);
    
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
    const { department, semester, subject } = req.query;
    
    // Build filter
    const studentFilter = {};
    if (department) studentFilter.department = department;
    if (semester) studentFilter.semester = parseInt(semester);
    
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
      if (subject) marksFilter.subject = subject;
      
      // Get all marks for this student
      const marksRecords = await Marks.find(marksFilter)
        .populate('subject', 'name code')
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
        
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';
        
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