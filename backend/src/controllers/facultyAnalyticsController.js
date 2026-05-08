const User = require('../models/User');
const Subject = require('../models/Subject');
const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const Homework = require('../models/Homework');
const Submission = require('../models/Submission');

// Get faculty dashboard analytics
exports.getFacultyDashboard = async (req, res) => {
  try {
    const facultyId = req.user._id;
    
    // Get all subjects handled by this faculty
    const subjects = await Subject.find({ faculty: facultyId })
      .populate('department', 'name');

    const subjectIds = subjects.map(s => s._id);

    // Get detailed analytics for each subject
    const subjectAnalytics = await Promise.all(
      subjects.map(async (subject) => {
        // Get all students in this subject
        const marks = await Marks.find({ subject: subject._id })
          .populate('student', 'name rollNumber semester');
        
        const attendance = await Attendance.find({ subject: subject._id });
        
        // Note: Homework is linked to course, not subject
        // For now, get homework by faculty and department
        const homework = await Homework.find({ 
          faculty: facultyId,
          department: subject.department._id
        });

        // Calculate performance metrics
        const studentPerformance = calculateStudentPerformance(marks);
        const attendanceMetrics = calculateAttendanceMetrics(attendance);
        const homeworkMetrics = await calculateHomeworkMetrics(homework, facultyId);

        return {
          subject: {
            id: subject._id,
            name: subject.name,
            code: subject.subjectCode,
            semester: subject.semester,
            department: subject.department
          },
          students: {
            total: marks.length,
            unique: new Set(marks.filter(m => m.student).map(m => m.student._id.toString())).size
          },
          performance: studentPerformance,
          attendance: attendanceMetrics,
          homework: homeworkMetrics
        };
      })
    );

    // Overall faculty metrics
    const overallMetrics = calculateOverallMetrics(subjectAnalytics);

    // Get workload distribution
    const workloadDistribution = calculateWorkloadDistribution(subjects, subjectAnalytics);

    // Get recent activities
    const recentActivities = await getRecentActivities(facultyId, subjectIds);

    res.json({
      success: true,
      data: {
        faculty: {
          name: req.user.name,
          email: req.user.email,
          department: req.user.department
        },
        overview: overallMetrics,
        subjects: subjectAnalytics,
        workload: workloadDistribution,
        recentActivities
      }
    });
  } catch (error) {
    console.error('Get faculty dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty dashboard',
      error: error.message
    });
  }
};

// Get subject-wise detailed analytics
exports.getSubjectAnalytics = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const facultyId = req.user._id;

    // Verify faculty teaches this subject
    const subject = await Subject.findOne({ _id: subjectId, faculty: facultyId })
      .populate('department', 'name');

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found or access denied'
      });
    }

    // Get all marks for this subject
    const marks = await Marks.find({ subject: subjectId })
      .populate('student', 'name rollNumber email semester cgpa')
      .sort({ 'student.rollNumber': 1 });

    // Get attendance records
    const attendance = await Attendance.find({ subject: subjectId })
      .populate('student', 'name rollNumber');

    // Get homework for this faculty and department
    const homeworks = await Homework.find({ 
      faculty: facultyId,
      department: subject.department._id
    });

    // Detailed student-wise analysis
    const studentAnalysis = await generateStudentWiseAnalysis(marks, attendance, homeworks);

    // Performance distribution
    const performanceDistribution = generatePerformanceDistribution(marks);

    // Attendance patterns
    const attendancePatterns = analyzeAttendancePatterns(attendance);

    // Homework analytics
    const homeworkAnalytics = await analyzeHomeworkSubmissions(homeworks);

    // Identify students needing attention
    const studentsNeedingAttention = identifyAtRiskStudents(studentAnalysis);

    res.json({
      success: true,
      data: {
        subject: {
          id: subject._id,
          name: subject.name,
          code: subject.subjectCode,
          semester: subject.semester,
          department: subject.department
        },
        students: studentAnalysis,
        performanceDistribution,
        attendancePatterns,
        homeworkAnalytics,
        studentsNeedingAttention
      }
    });
  } catch (error) {
    console.error('Get subject analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subject analytics',
      error: error.message
    });
  }
};

// Get plagiarism trends
exports.getPlagiarismTrends = async (req, res) => {
  try {
    const facultyId = req.user._id;
    const { subjectId, timeframe = '30' } = req.query;

    const query = { createdBy: facultyId };
    if (subjectId) query.subject = subjectId;

    // Get homeworks created by this faculty
    const homeworks = await Homework.find(query)
      .populate('subject', 'name code')
      .sort({ createdAt: -1 });

    const homeworkIds = homeworks.map(h => h._id);

    // Get all submissions for these homeworks
    const submissions = await Submission.find({ homework: { $in: homeworkIds } })
      .populate('student', 'name rollNumber semester')
      .populate('homework', 'title subject');

    // Analyze plagiarism trends
    const plagiarismTrends = analyzePlagiarismTrends(submissions, timeframe);

    // Identify repeat offenders
    const repeatOffenders = identifyRepeatOffenders(submissions);

    // Subject-wise plagiarism stats
    const subjectWiseStats = calculateSubjectWisePlagiarism(submissions);

    // Severity distribution
    const severityDistribution = calculateSeverityDistribution(submissions);

    res.json({
      success: true,
      data: {
        overall: {
          totalSubmissions: submissions.length,
          flaggedSubmissions: submissions.filter(s => s.plagiarismScore > 30).length,
          averagePlagiarismScore: calculateAveragePlagiarism(submissions),
          highRiskCount: submissions.filter(s => s.plagiarismScore > 60).length
        },
        trends: plagiarismTrends,
        repeatOffenders,
        subjectWiseStats,
        severityDistribution
      }
    });
  } catch (error) {
    console.error('Get plagiarism trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plagiarism trends',
      error: error.message
    });
  }
};

// Get attendance consistency analytics
exports.getAttendanceConsistency = async (req, res) => {
  try {
    const facultyId = req.user._id;
    const { subjectId } = req.query;

    // Get subjects taught by faculty
    const query = { faculty: facultyId };
    if (subjectId) query._id = subjectId;

    const subjects = await Subject.find(query);
    const subjectIds = subjects.map(s => s._id);

    // Get all attendance records
    const attendanceRecords = await Attendance.find({ subject: { $in: subjectIds } })
      .populate('student', 'name rollNumber semester')
      .populate('subject', 'name code')
      .sort({ date: -1 });

    // Analyze consistency patterns
    const consistencyAnalysis = analyzeAttendanceConsistency(attendanceRecords);

    // Identify irregular patterns
    const irregularPatterns = identifyIrregularAttendance(attendanceRecords);

    // Monthly trends
    const monthlyTrends = calculateMonthlyAttendanceTrends(attendanceRecords);

    // Day-wise patterns (which days have lower attendance)
    const dayWisePatterns = analyzeDayWisePatterns(attendanceRecords);

    res.json({
      success: true,
      data: {
        overall: {
          totalClasses: attendanceRecords.length,
          averageAttendance: calculateAverageAttendanceRate(attendanceRecords),
          consistencyScore: calculateConsistencyScore(attendanceRecords)
        },
        consistency: consistencyAnalysis,
        irregularPatterns,
        monthlyTrends,
        dayWisePatterns
      }
    });
  } catch (error) {
    console.error('Get attendance consistency error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance consistency',
      error: error.message
    });
  }
};

// Helper functions

function calculateStudentPerformance(marks) {
  if (marks.length === 0) {
    return {
      average: 0,
      highest: 0,
      lowest: 0,
      passPercentage: 0,
      gradeDistribution: {}
    };
  }

  // Calculate percentage for each mark
  const percentages = marks.map(m => (m.marks / m.maxMarks) * 100);
  const total = percentages.reduce((sum, score) => sum + score, 0);
  const average = total / percentages.length;
  
  const passed = percentages.filter(p => p >= 40).length;
  const passPercentage = (passed / marks.length) * 100;

  const gradeDistribution = {
    'A+ (90-100)': percentages.filter(p => p >= 90).length,
    'A (80-89)': percentages.filter(p => p >= 80 && p < 90).length,
    'B+ (70-79)': percentages.filter(p => p >= 70 && p < 80).length,
    'B (60-69)': percentages.filter(p => p >= 60 && p < 70).length,
    'C (50-59)': percentages.filter(p => p >= 50 && p < 60).length,
    'D (40-49)': percentages.filter(p => p >= 40 && p < 50).length,
    'F (<40)': percentages.filter(p => p < 40).length
  };

  return {
    average: parseFloat(average.toFixed(2)),
    highest: Math.max(...percentages),
    lowest: Math.min(...percentages),
    passPercentage: parseFloat(passPercentage.toFixed(2)),
    gradeDistribution,
    totalStudents: marks.length
  };
}

function calculateAttendanceMetrics(attendance) {
  if (attendance.length === 0) {
    return {
      totalClasses: 0,
      averageAttendance: 0,
      consistency: 'N/A'
    };
  }

  const totalClasses = attendance.length;
  const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
  const averageAttendance = (presentCount / totalClasses) * 100;

  // Calculate consistency (standard deviation)
  const attendanceRates = attendance.map(a => a.status === 'PRESENT' ? 100 : 0);
  const stdDev = calculateStandardDeviation(attendanceRates);
  
  let consistency = 'High';
  if (stdDev > 30) consistency = 'Low';
  else if (stdDev > 15) consistency = 'Medium';

  return {
    totalClasses,
    averageAttendance: parseFloat(averageAttendance.toFixed(2)),
    consistency,
    consistencyScore: parseFloat((100 - stdDev).toFixed(2))
  };
}

async function calculateHomeworkMetrics(homeworks, facultyId) {
  if (homeworks.length === 0) {
    return {
      totalAssignments: 0,
      averageSubmissionRate: 0,
      averagePlagiarismScore: 0,
      highPlagiarismCount: 0
    };
  }

  const totalAssignments = homeworks.length;
  let totalSubmissions = 0;
  let totalExpected = 0;
  let plagiarismScores = [];

  for (const homework of homeworks) {
    const submissions = await Submission.find({ homework: homework._id });
    totalSubmissions += submissions.length;
    // Estimate expected submissions based on actual submissions since we don't have targetStudents
    totalExpected += submissions.length;
    
    submissions.forEach(sub => {
      if (sub.plagiarismScore !== undefined) {
        plagiarismScores.push(sub.plagiarismScore);
      }
    });
  }

  const averageSubmissionRate = totalExpected > 0 
    ? (totalSubmissions / totalExpected) * 100 
    : 0;

  const averagePlagiarismScore = plagiarismScores.length > 0
    ? plagiarismScores.reduce((sum, score) => sum + score, 0) / plagiarismScores.length
    : 0;

  const highPlagiarismCount = plagiarismScores.filter(score => score > 60).length;

  return {
    totalAssignments,
    totalSubmissions,
    averageSubmissionRate: parseFloat(averageSubmissionRate.toFixed(2)),
    averagePlagiarismScore: parseFloat(averagePlagiarismScore.toFixed(2)),
    highPlagiarismCount,
    plagiarismTrend: categorizePlagiarismTrend(averagePlagiarismScore)
  };
}

function calculateOverallMetrics(subjectAnalytics) {
  const totalSubjects = subjectAnalytics.length;
  
  if (totalSubjects === 0) {
    return {
      totalSubjects: 0,
      totalStudents: 0,
      averagePerformance: 0,
      averageAttendance: 0,
      averageSubmissionRate: 0,
      averagePlagiarismScore: 0,
      workloadLevel: 'None'
    };
  }
  
  const totalStudents = subjectAnalytics.reduce((sum, s) => sum + s.students.unique, 0);
  
  const avgPerformance = subjectAnalytics.reduce((sum, s) => sum + s.performance.average, 0) / totalSubjects;
  const avgAttendance = subjectAnalytics.reduce((sum, s) => sum + s.attendance.averageAttendance, 0) / totalSubjects;
  const avgSubmissionRate = subjectAnalytics.reduce((sum, s) => sum + s.homework.averageSubmissionRate, 0) / totalSubjects;
  const avgPlagiarism = subjectAnalytics.reduce((sum, s) => sum + s.homework.averagePlagiarismScore, 0) / totalSubjects;

  return {
    totalSubjects,
    totalStudents,
    averagePerformance: parseFloat(avgPerformance.toFixed(2)),
    averageAttendance: parseFloat(avgAttendance.toFixed(2)),
    averageSubmissionRate: parseFloat(avgSubmissionRate.toFixed(2)),
    averagePlagiarismScore: parseFloat(avgPlagiarism.toFixed(2)),
    workloadLevel: categorizeWorkload(totalSubjects, totalStudents)
  };
}

function calculateWorkloadDistribution(subjects, analytics) {
  return {
    subjectCount: subjects.length,
    studentCount: analytics.reduce((sum, s) => sum + s.students.unique, 0),
    semesterDistribution: subjects.reduce((acc, subject) => {
      const sem = `Semester ${subject.semester}`;
      acc[sem] = (acc[sem] || 0) + 1;
      return acc;
    }, {}),
    homeworkLoad: analytics.reduce((sum, s) => sum + s.homework.totalAssignments, 0),
    classesPerWeek: subjects.length * 3 // Assuming 3 classes per subject per week
  };
}

async function getRecentActivities(facultyId, subjectIds) {
  const recentHomeworks = await Homework.find({ 
    faculty: facultyId 
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('course', 'name');

  const recentMarks = await Marks.find({ 
    subject: { $in: subjectIds } 
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('student', 'name')
    .populate('subject', 'name');

  return {
    recentHomeworks: recentHomeworks.map(h => ({
      title: h.title,
      course: h.course?.name || 'N/A',
      dueDate: h.dueDate,
      submissionCount: h.submissionCount || 0
    })),
    recentGradings: recentMarks.map(m => ({
      student: m.student?.name || 'N/A',
      subject: m.subject?.name || 'N/A',
      marks: m.marks,
      total: m.maxMarks,
      date: m.createdAt
    }))
  };
}

async function generateStudentWiseAnalysis(marks, attendance, homeworks) {
  const studentMap = new Map();

  // Process marks
  marks.forEach(mark => {
    if (!mark.student) return; // Skip if student is null
    
    const studentId = mark.student._id.toString();
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        student: mark.student,
        marks: [],
        attendance: { present: 0, total: 0 },
        homework: { submitted: 0, total: 0 }
      });
    }
    const percentage = (mark.marks / mark.maxMarks) * 100;
    studentMap.get(studentId).marks.push(percentage);
  });

  // Process attendance
  attendance.forEach(att => {
    if (!att.student) return; // Skip if student is null
    
    const studentId = att.student._id.toString();
    if (studentMap.has(studentId)) {
      const data = studentMap.get(studentId);
      data.attendance.total++;
      if (att.status === 'PRESENT') data.attendance.present++;
    }
  });

  // Process homework submissions
  for (const homework of homeworks) {
    const submissions = await Submission.find({ homework: homework._id });
    submissions.forEach(sub => {
      const studentId = sub.student.toString();
      if (studentMap.has(studentId)) {
        const data = studentMap.get(studentId);
        data.homework.submitted++;
        data.homework.total++;
      }
    });
  }

  // Calculate metrics for each student
  return Array.from(studentMap.values()).map(data => {
    const avgMarks = data.marks.length > 0 
      ? data.marks.reduce((sum, m) => sum + m, 0) / data.marks.length 
      : 0;
    const attendanceRate = data.attendance.total > 0
      ? (data.attendance.present / data.attendance.total) * 100
      : 0;
    const submissionRate = data.homework.total > 0
      ? (data.homework.submitted / data.homework.total) * 100
      : 0;

    return {
      student: {
        id: data.student._id,
        name: data.student.name,
        rollNumber: data.student.rollNumber,
        semester: data.student.semester
      },
      performance: {
        average: parseFloat(avgMarks.toFixed(2)),
        examsWritten: data.marks.length
      },
      attendance: {
        rate: parseFloat(attendanceRate.toFixed(2)),
        present: data.attendance.present,
        total: data.attendance.total
      },
      homework: {
        submissionRate: parseFloat(submissionRate.toFixed(2)),
        submitted: data.homework.submitted,
        total: data.homework.total
      }
    };
  });
}

function generatePerformanceDistribution(marks) {
  const ranges = [
    { label: '90-100', min: 90, max: 100 },
    { label: '80-89', min: 80, max: 89 },
    { label: '70-79', min: 70, max: 79 },
    { label: '60-69', min: 60, max: 69 },
    { label: '50-59', min: 50, max: 59 },
    { label: '40-49', min: 40, max: 49 },
    { label: '<40', min: 0, max: 39 }
  ];

  return ranges.map(range => ({
    label: range.label,
    count: marks.filter(m => {
      const percentage = (m.marks / m.maxMarks) * 100;
      return percentage >= range.min && percentage <= range.max;
    }).length
  }));
}

function analyzeAttendancePatterns(attendance) {
  // Group by date
  const dateMap = new Map();
  
  attendance.forEach(att => {
    const date = att.date.toISOString().split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, { present: 0, total: 0 });
    }
    const data = dateMap.get(date);
    data.total++;
    if (att.status === 'PRESENT') data.present++;
  });

  const patterns = Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    attendanceRate: (data.present / data.total) * 100,
    totalStudents: data.total
  }));

  return patterns.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);
}

async function analyzeHomeworkSubmissions(homeworks) {
  const analytics = await Promise.all(homeworks.map(async (homework) => {
    const submissions = await Submission.find({ homework: homework._id });
    
    const onTime = submissions.filter(s => !s.isLate).length;
    const late = submissions.filter(s => s.isLate).length;
    const plagiarismScores = submissions
      .filter(s => s.plagiarismScore !== undefined)
      .map(s => s.plagiarismScore);

    return {
      title: homework.title,
      dueDate: homework.dueDate,
      totalSubmissions: submissions.length,
      onTimeSubmissions: onTime,
      lateSubmissions: late,
      averagePlagiarismScore: plagiarismScores.length > 0
        ? plagiarismScores.reduce((sum, s) => sum + s, 0) / plagiarismScores.length
        : 0,
      highPlagiarismCount: plagiarismScores.filter(s => s > 60).length
    };
  }));

  return analytics;
}

function identifyAtRiskStudents(studentAnalysis) {
  return studentAnalysis.filter(student => 
    student.performance.average < 50 ||
    student.attendance.rate < 75 ||
    student.homework.submissionRate < 60
  ).map(student => ({
    ...student,
    riskFactors: {
      lowPerformance: student.performance.average < 50,
      lowAttendance: student.attendance.rate < 75,
      lowSubmissions: student.homework.submissionRate < 60
    },
    riskLevel: calculateRiskLevel(student)
  }));
}

function analyzePlagiarismTrends(submissions, timeframe) {
  const days = parseInt(timeframe);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentSubmissions = submissions.filter(s => s.createdAt >= cutoffDate);
  
  // Group by week
  const weeklyData = {};
  recentSubmissions.forEach(sub => {
    const week = getWeekNumber(sub.createdAt);
    if (!weeklyData[week]) {
      weeklyData[week] = { total: 0, flagged: 0, scores: [] };
    }
    weeklyData[week].total++;
    if (sub.plagiarismScore > 30) weeklyData[week].flagged++;
    if (sub.plagiarismScore !== undefined) weeklyData[week].scores.push(sub.plagiarismScore);
  });

  return Object.entries(weeklyData).map(([week, data]) => ({
    week,
    totalSubmissions: data.total,
    flaggedCount: data.flagged,
    averageScore: data.scores.length > 0 
      ? data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length 
      : 0
  }));
}

function identifyRepeatOffenders(submissions) {
  const studentMap = new Map();

  submissions.forEach(sub => {
    const studentId = sub.student._id.toString();
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        student: sub.student,
        violations: [],
        totalSubmissions: 0
      });
    }
    const data = studentMap.get(studentId);
    data.totalSubmissions++;
    if (sub.plagiarismScore > 50) {
      data.violations.push({
        homework: sub.homework.title,
        score: sub.plagiarismScore,
        date: sub.createdAt
      });
    }
  });

  return Array.from(studentMap.values())
    .filter(data => data.violations.length >= 2)
    .map(data => ({
      student: data.student,
      violationCount: data.violations.length,
      totalSubmissions: data.totalSubmissions,
      violations: data.violations,
      riskLevel: data.violations.length >= 3 ? 'High' : 'Medium'
    }))
    .sort((a, b) => b.violationCount - a.violationCount);
}

function calculateSubjectWisePlagiarism(submissions) {
  const subjectMap = new Map();

  submissions.forEach(sub => {
    const subjectId = sub.homework.subject.toString();
    if (!subjectMap.has(subjectId)) {
      subjectMap.set(subjectId, {
        scores: [],
        total: 0,
        flagged: 0
      });
    }
    const data = subjectMap.get(subjectId);
    data.total++;
    if (sub.plagiarismScore !== undefined) {
      data.scores.push(sub.plagiarismScore);
      if (sub.plagiarismScore > 30) data.flagged++;
    }
  });

  return Array.from(subjectMap.entries()).map(([subjectId, data]) => ({
    subjectId,
    totalSubmissions: data.total,
    flaggedCount: data.flagged,
    averageScore: data.scores.length > 0
      ? data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length
      : 0,
    flaggedPercentage: data.total > 0 ? (data.flagged / data.total) * 100 : 0
  }));
}

function calculateSeverityDistribution(submissions) {
  const withScores = submissions.filter(s => s.plagiarismScore !== undefined);
  
  return {
    low: withScores.filter(s => s.plagiarismScore < 30).length,
    medium: withScores.filter(s => s.plagiarismScore >= 30 && s.plagiarismScore < 60).length,
    high: withScores.filter(s => s.plagiarismScore >= 60 && s.plagiarismScore < 80).length,
    critical: withScores.filter(s => s.plagiarismScore >= 80).length
  };
}

function analyzeAttendanceConsistency(attendanceRecords) {
  // Group by student
  const studentMap = new Map();

  attendanceRecords.forEach(record => {
    if (!record.student) return; // Skip if student is null
    
    const studentId = record.student._id.toString();
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        student: record.student,
        records: []
      });
    }
    studentMap.get(studentId).records.push(record);
  });

  return Array.from(studentMap.values()).map(data => {
    const present = data.records.filter(r => r.status === 'present').length;
    const total = data.records.length;
    const rate = total > 0 ? (present / total) * 100 : 0;

    // Calculate consistency
    const attendancePattern = data.records.map(r => r.status === 'present' ? 1 : 0);
    const consistency = calculateConsistencyFromPattern(attendancePattern);

    return {
      student: data.student,
      attendanceRate: parseFloat(rate.toFixed(2)),
      totalClasses: total,
      presentCount: present,
      consistency,
      isConsistent: consistency > 70
    };
  }).sort((a, b) => b.attendanceRate - a.attendanceRate);
}

function identifyIrregularAttendance(attendanceRecords) {
  const studentMap = new Map();

  attendanceRecords.forEach(record => {
    if (!record.student) return; // Skip if student is null
    
    const studentId = record.student._id.toString();
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        student: record.student,
        absences: [],
        total: 0
      });
    }
    const data = studentMap.get(studentId);
    data.total++;
    if (record.status === 'ABSENT') {
      data.absences.push(record.date);
    }
  });

  return Array.from(studentMap.values())
    .filter(data => data.absences.length >= 3)
    .map(data => ({
      student: data.student,
      absenceCount: data.absences.length,
      totalClasses: data.total,
      attendanceRate: ((data.total - data.absences.length) / data.total) * 100,
      recentAbsences: data.absences.slice(0, 5)
    }))
    .sort((a, b) => b.absenceCount - a.absenceCount);
}

function calculateMonthlyAttendanceTrends(attendanceRecords) {
  const monthMap = new Map();

  attendanceRecords.forEach(record => {
    const month = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(month)) {
      monthMap.set(month, { present: 0, total: 0 });
    }
    const data = monthMap.get(month);
    data.total++;
    if (record.status === 'present') data.present++;
  });

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      attendanceRate: (data.present / data.total) * 100,
      totalClasses: data.total
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function analyzeDayWisePatterns(attendanceRecords) {
  const dayMap = new Map();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  attendanceRecords.forEach(record => {
    const day = days[record.date.getDay()];
    if (!dayMap.has(day)) {
      dayMap.set(day, { present: 0, total: 0 });
    }
    const data = dayMap.get(day);
    data.total++;
    if (record.status === 'present') data.present++;
  });

  return Array.from(dayMap.entries()).map(([day, data]) => ({
    day,
    attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
    totalClasses: data.total
  }));
}

// Utility functions

function calculateStandardDeviation(values) {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

function categorizePlagiarismTrend(score) {
  if (score < 20) return 'Excellent';
  if (score < 40) return 'Good';
  if (score < 60) return 'Concerning';
  return 'Critical';
}

function categorizeWorkload(subjectCount, studentCount) {
  const workloadScore = subjectCount * 30 + studentCount;
  if (workloadScore < 100) return 'Light';
  if (workloadScore < 200) return 'Moderate';
  if (workloadScore < 300) return 'Heavy';
  return 'Very Heavy';
}

function calculateAveragePlagiarism(submissions) {
  const scores = submissions
    .filter(s => s.plagiarismScore !== undefined)
    .map(s => s.plagiarismScore);
  return scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 0;
}

function calculateAverageAttendanceRate(attendanceRecords) {
  if (attendanceRecords.length === 0) return 0;
  const present = attendanceRecords.filter(r => r.status === 'PRESENT').length;
  return (present / attendanceRecords.length) * 100;
}

function calculateConsistencyScore(attendanceRecords) {
  // Group by date and calculate daily attendance rates
  const dateMap = new Map();
  
  attendanceRecords.forEach(record => {
    const date = record.date.toISOString().split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, { present: 0, total: 0 });
    }
    const data = dateMap.get(date);
    data.total++;
    if (record.status === 'present') data.present++;
  });

  const rates = Array.from(dateMap.values()).map(d => (d.present / d.total) * 100);
  const stdDev = calculateStandardDeviation(rates);
  
  return Math.max(0, 100 - stdDev);
}

function calculateConsistencyFromPattern(pattern) {
  if (pattern.length === 0) return 0;
  
  // Count consecutive streaks
  let streaks = [];
  let currentStreak = 1;
  
  for (let i = 1; i < pattern.length; i++) {
    if (pattern[i] === pattern[i-1]) {
      currentStreak++;
    } else {
      streaks.push(currentStreak);
      currentStreak = 1;
    }
  }
  streaks.push(currentStreak);
  
  // Consistency is higher with longer streaks
  const avgStreakLength = streaks.reduce((sum, s) => sum + s, 0) / streaks.length;
  return Math.min(100, avgStreakLength * 10);
}

function calculateRiskLevel(student) {
  let riskScore = 0;
  
  if (student.performance.average < 40) riskScore += 3;
  else if (student.performance.average < 50) riskScore += 2;
  else if (student.performance.average < 60) riskScore += 1;
  
  if (student.attendance.rate < 60) riskScore += 3;
  else if (student.attendance.rate < 75) riskScore += 2;
  else if (student.attendance.rate < 85) riskScore += 1;
  
  if (student.homework.submissionRate < 50) riskScore += 2;
  else if (student.homework.submissionRate < 70) riskScore += 1;
  
  if (riskScore >= 5) return 'Critical';
  if (riskScore >= 3) return 'High';
  if (riskScore >= 1) return 'Medium';
  return 'Low';
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo}`;
}

module.exports = exports;
