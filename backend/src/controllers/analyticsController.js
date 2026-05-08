const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Course = require('../models/Course');
const {
  predictPerformance,
  calculateCorrelation,
  assessRiskLevel,
  generateInsights,
  calculatePercentile,
  identifyWeakSubjects,
  movingAverage
} = require('../utils/predictiveAnalytics');

/**
 * Get comprehensive dashboard analytics
 */
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const { studentId, departmentId, courseId, semester } = req.query;
    const userId = studentId || req.user._id;

    // Fetch student data
    const student = await User.findById(userId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Build filter
    const marksFilter = { student: userId };
    if (semester) marksFilter.semester = semester;
    if (courseId) marksFilter.course = courseId;

    // Fetch marks and attendance
    const marks = await Marks.find(marksFilter)
      .populate('course subject')
      .sort({ semester: 1, examDate: 1 });

    const attendance = await Attendance.find({ student: userId })
      .populate('subject')
      .sort({ date: 1 });

    // Calculate overall statistics
    const overallStats = calculateOverallStats(marks);
    
    // Calculate subject-wise performance
    const subjectPerformance = calculateSubjectPerformance(marks);
    
    // Calculate semester-wise comparison
    const semesterComparison = calculateSemesterComparison(marks);
    
    // Calculate attendance statistics
    const attendanceStats = calculateAttendanceStats(attendance);
    
    // Calculate rank
    const rankData = await calculateRank(userId, departmentId);
    
    // Correlation analysis
    const correlationData = analyzeAttendancePerformance(marks, attendance);
    
    // Predictive analytics
    const prediction = await generatePredictions(userId, marks, attendance);

    res.json({
      success: true,
      data: {
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
          department: student.department
        },
        overallStats,
        subjectPerformance,
        semesterComparison,
        attendanceStats,
        rankData,
        correlationData,
        prediction
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

/**
 * Get semester-wise comparison
 */
exports.getSemesterComparison = async (req, res) => {
  try {
    const { studentId, departmentId } = req.query;
    const userId = studentId || req.user._id;

    const marks = await Marks.find({ student: userId })
      .populate('course subject')
      .sort({ semester: 1 });

    const semesterData = calculateSemesterComparison(marks);
    const trendAnalysis = analyzeSemesterTrends(semesterData);

    res.json({
      success: true,
      data: {
        semesters: semesterData,
        trends: trendAnalysis,
        bestSemester: semesterData.reduce((best, curr) => 
          curr.average > best.average ? curr : best, semesterData[0]),
        improvement: calculateImprovement(semesterData)
      }
    });
  } catch (error) {
    console.error('Semester comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching semester comparison',
      error: error.message
    });
  }
};

/**
 * Get subject-wise performance
 */
exports.getSubjectPerformance = async (req, res) => {
  try {
    const { studentId, semester } = req.query;
    const userId = studentId || req.user._id;

    const filter = { student: userId };
    if (semester) filter.semester = semester;

    const marks = await Marks.find(filter).populate('subject course');
    const subjectData = calculateSubjectPerformance(marks);
    
    // Identify weak subjects
    const weakSubjects = identifyWeakSubjects(subjectData, 60);
    
    // Calculate subject rankings
    const subjectRankings = subjectData.map(subject => ({
      ...subject,
      rank: subject.rank || 'N/A'
    }));

    res.json({
      success: true,
      data: {
        subjects: subjectRankings,
        weakSubjects,
        strongSubjects: subjectData.filter(s => s.average >= 75),
        summary: {
          totalSubjects: subjectData.length,
          averageScore: subjectData.reduce((sum, s) => sum + s.average, 0) / subjectData.length,
          passedSubjects: subjectData.filter(s => s.average >= 40).length,
          failedSubjects: subjectData.filter(s => s.average < 40).length
        }
      }
    });
  } catch (error) {
    console.error('Subject performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subject performance',
      error: error.message
    });
  }
};

/**
 * Get class rank tracking
 */
exports.getRankTracking = async (req, res) => {
  try {
    const { departmentId, semester, courseId } = req.query;
    const userId = req.user._id;

    const rankData = await calculateRank(userId, departmentId, semester, courseId);
    const historicalRanks = await getHistoricalRanks(userId, departmentId);
    const rankTrend = analyzeRankTrend(historicalRanks);

    res.json({
      success: true,
      data: {
        currentRank: rankData,
        history: historicalRanks,
        trend: rankTrend,
        percentile: rankData.percentile
      }
    });
  } catch (error) {
    console.error('Rank tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rank data',
      error: error.message
    });
  }
};

/**
 * Get attendance vs performance correlation
 */
exports.getAttendanceCorrelation = async (req, res) => {
  try {
    const { studentId } = req.query;
    const userId = studentId || req.user._id;

    const marks = await Marks.find({ student: userId }).populate('subject');
    const attendance = await Attendance.find({ student: userId }).populate('subject');

    const correlationData = analyzeAttendancePerformance(marks, attendance);
    const subjectCorrelations = calculateSubjectWiseCorrelation(marks, attendance);

    res.json({
      success: true,
      data: {
        overall: correlationData,
        bySubject: subjectCorrelations,
        insights: generateCorrelationInsights(correlationData, subjectCorrelations)
      }
    });
  } catch (error) {
    console.error('Correlation analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing correlation',
      error: error.message
    });
  }
};

/**
 * Get predictive analytics
 */
exports.getPredictiveAnalytics = async (req, res) => {
  try {
    const { studentId } = req.query;
    const userId = studentId || req.user._id;

    const marks = await Marks.find({ student: userId })
      .populate('subject')
      .sort({ examDate: 1 });
    
    const attendance = await Attendance.find({ student: userId })
      .sort({ date: 1 });

    const predictions = await generatePredictions(userId, marks, attendance);
    const riskAssessment = await assessStudentRisk(userId, marks, attendance);
    const insights = generateInsights({
      grades: marks.map((m, i) => ({ value: m.totalMarks, label: m.subject?.name })),
      attendance: attendance,
      trend: predictions.trend,
      correlation: predictions.correlation,
      riskLevel: riskAssessment
    });

    res.json({
      success: true,
      data: {
        predictions,
        riskAssessment,
        insights,
        recommendations: generateRecommendations(riskAssessment, predictions)
      }
    });
  } catch (error) {
    console.error('Predictive analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating predictions',
      error: error.message
    });
  }
};

/**
 * Get department-wide analytics
 */
exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const { departmentId, semester } = req.query;

    const filter = {};
    if (semester) filter.semester = semester;

    // Get all students in department
    const students = await User.find({ 
      department: departmentId, 
      role: 'student' 
    });

    const studentIds = students.map(s => s._id);
    
    // Get marks for all students
    const marks = await Marks.find({ 
      student: { $in: studentIds },
      ...filter 
    }).populate('student subject');

    // Calculate department statistics
    const departmentStats = {
      totalStudents: students.length,
      averagePerformance: marks.reduce((sum, m) => sum + m.totalMarks, 0) / marks.length,
      topPerformers: await getTopPerformers(departmentId, semester, 10),
      subjectAnalysis: calculateDepartmentSubjectPerformance(marks),
      performanceDistribution: calculatePerformanceDistribution(marks),
      passPercentage: calculatePassPercentage(marks)
    };

    res.json({
      success: true,
      data: departmentStats
    });
  } catch (error) {
    console.error('Department analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching department analytics',
      error: error.message
    });
  }
};

// Helper Functions

function calculateOverallStats(marks) {
  if (marks.length === 0) {
    return { average: 0, highest: 0, lowest: 0, total: 0 };
  }

  const scores = marks.map(m => m.totalMarks);
  return {
    average: scores.reduce((a, b) => a + b, 0) / scores.length,
    highest: Math.max(...scores),
    lowest: Math.min(...scores),
    total: marks.length,
    cgpa: calculateCGPA(marks)
  };
}

function calculateSubjectPerformance(marks) {
  const subjectMap = new Map();

  marks.forEach(mark => {
    const subjectId = mark.subject?._id?.toString();
    const subjectName = mark.subject?.name || 'Unknown';

    if (!subjectMap.has(subjectId)) {
      subjectMap.set(subjectId, {
        name: subjectName,
        scores: [],
        exams: []
      });
    }

    subjectMap.get(subjectId).scores.push(mark.totalMarks);
    subjectMap.get(subjectId).exams.push({
      type: mark.examType,
      score: mark.totalMarks,
      date: mark.examDate
    });
  });

  return Array.from(subjectMap.values()).map(subject => {
    const average = subject.scores.reduce((a, b) => a + b, 0) / subject.scores.length;
    const highest = Math.max(...subject.scores);
    const lowest = Math.min(...subject.scores);
    
    return {
      name: subject.name,
      average: Math.round(average * 10) / 10,
      highest,
      lowest,
      totalExams: subject.exams.length,
      exams: subject.exams,
      grade: getGrade(average)
    };
  });
}

function calculateSemesterComparison(marks) {
  const semesterMap = new Map();

  marks.forEach(mark => {
    const sem = mark.semester || 1;
    
    if (!semesterMap.has(sem)) {
      semesterMap.set(sem, { scores: [], subjects: new Set() });
    }

    semesterMap.get(sem).scores.push(mark.totalMarks);
    semesterMap.get(sem).subjects.add(mark.subject?.name);
  });

  return Array.from(semesterMap.entries())
    .map(([semester, data]) => ({
      semester,
      average: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      totalSubjects: data.subjects.size,
      totalExams: data.scores.length,
      highest: Math.max(...data.scores),
      lowest: Math.min(...data.scores)
    }))
    .sort((a, b) => a.semester - b.semester);
}

function calculateAttendanceStats(attendance) {
  if (attendance.length === 0) {
    return { overall: 0, bySubject: [] };
  }

  const present = attendance.filter(a => a.status === 'present').length;
  const total = attendance.length;
  const overallPercentage = (present / total) * 100;

  // Subject-wise attendance
  const subjectMap = new Map();
  attendance.forEach(att => {
    const subjectName = att.subject?.name || 'Unknown';
    if (!subjectMap.has(subjectName)) {
      subjectMap.set(subjectName, { present: 0, total: 0 });
    }
    subjectMap.get(subjectName).total++;
    if (att.status === 'present') {
      subjectMap.get(subjectName).present++;
    }
  });

  const bySubject = Array.from(subjectMap.entries()).map(([subject, data]) => ({
    subject,
    percentage: (data.present / data.total) * 100,
    present: data.present,
    total: data.total
  }));

  return {
    overall: Math.round(overallPercentage * 10) / 10,
    present,
    total,
    bySubject
  };
}

async function calculateRank(userId, departmentId, semester, courseId) {
  const filter = { department: departmentId, role: 'student' };
  const students = await User.find(filter);
  
  const marksFilter = { student: { $in: students.map(s => s._id) } };
  if (semester) marksFilter.semester = semester;
  if (courseId) marksFilter.course = courseId;

  const allMarks = await Marks.find(marksFilter);

  // Calculate average for each student
  const studentAverages = new Map();
  allMarks.forEach(mark => {
    const studentId = mark.student.toString();
    if (!studentAverages.has(studentId)) {
      studentAverages.set(studentId, []);
    }
    studentAverages.get(studentId).push(mark.totalMarks);
  });

  const rankings = Array.from(studentAverages.entries())
    .map(([studentId, scores]) => ({
      studentId,
      average: scores.reduce((a, b) => a + b, 0) / scores.length
    }))
    .sort((a, b) => b.average - a.average);

  const userRankIndex = rankings.findIndex(r => r.studentId === userId.toString());
  const rank = userRankIndex + 1;
  const percentile = calculatePercentile(
    rankings[userRankIndex]?.average || 0,
    rankings.map(r => r.average)
  );

  return {
    rank,
    totalStudents: rankings.length,
    percentile,
    average: rankings[userRankIndex]?.average || 0,
    topScore: rankings[0]?.average || 0
  };
}

async function getHistoricalRanks(userId, departmentId) {
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  const history = [];

  for (const sem of semesters) {
    try {
      const rankData = await calculateRank(userId, departmentId, sem);
      if (rankData.rank > 0) {
        history.push({ semester: sem, ...rankData });
      }
    } catch (err) {
      console.error(`Error calculating rank for semester ${sem}:`, err);
    }
  }

  return history;
}

function analyzeAttendancePerformance(marks, attendance) {
  // Group by subject
  const subjectData = new Map();

  marks.forEach(mark => {
    const subjectId = mark.subject?._id?.toString();
    if (!subjectData.has(subjectId)) {
      subjectData.set(subjectId, { marks: [], attendance: [] });
    }
    subjectData.get(subjectId).marks.push(mark.totalMarks);
  });

  attendance.forEach(att => {
    const subjectId = att.subject?._id?.toString();
    if (subjectData.has(subjectId)) {
      subjectData.get(subjectId).attendance.push(att.status === 'present' ? 1 : 0);
    }
  });

  // Calculate overall correlation
  const allMarks = [];
  const allAttendance = [];

  subjectData.forEach(data => {
    const avgMark = data.marks.reduce((a, b) => a + b, 0) / data.marks.length;
    const attRate = data.attendance.reduce((a, b) => a + b, 0) / data.attendance.length * 100;
    allMarks.push(avgMark);
    allAttendance.push(attRate);
  });

  return calculateCorrelation(allAttendance, allMarks);
}

function calculateSubjectWiseCorrelation(marks, attendance) {
  const subjectMap = new Map();

  marks.forEach(mark => {
    const subjectName = mark.subject?.name || 'Unknown';
    if (!subjectMap.has(subjectName)) {
      subjectMap.set(subjectName, { marks: [], attendance: [] });
    }
  });

  // Calculate attendance rate per subject
  const attendanceBySubject = new Map();
  attendance.forEach(att => {
    const subjectName = att.subject?.name || 'Unknown';
    if (!attendanceBySubject.has(subjectName)) {
      attendanceBySubject.set(subjectName, { present: 0, total: 0 });
    }
    attendanceBySubject.get(subjectName).total++;
    if (att.status === 'present') {
      attendanceBySubject.get(subjectName).present++;
    }
  });

  return Array.from(subjectMap.keys()).map(subject => {
    const marksData = marks
      .filter(m => m.subject?.name === subject)
      .map(m => m.totalMarks);
    
    const attData = attendanceBySubject.get(subject);
    const attRate = attData ? (attData.present / attData.total) * 100 : 0;

    return {
      subject,
      averageMarks: marksData.reduce((a, b) => a + b, 0) / marksData.length,
      attendanceRate: attRate,
      correlation: 'moderate' // Simplified
    };
  });
}

async function generatePredictions(userId, marks, attendance) {
  const semesterData = calculateSemesterComparison(marks);
  const historicalGrades = semesterData.map((sem, i) => ({ value: sem.average, label: `Sem ${sem.semester}` }));

  const prediction = predictPerformance(historicalGrades, 1);
  const attendanceStats = calculateAttendanceStats(attendance);

  return {
    nextSemesterPrediction: prediction.prediction,
    confidence: prediction.confidence,
    trend: prediction.trend,
    expectedAttendance: attendanceStats.overall,
    correlation: analyzeAttendancePerformance(marks, attendance)
  };
}

async function assessStudentRisk(userId, marks, attendance) {
  const recentMarks = marks.slice(-5);
  const avgGrade = recentMarks.reduce((sum, m) => sum + m.totalMarks, 0) / recentMarks.length;
  
  const attendanceStats = calculateAttendanceStats(attendance);
  const semesterData = calculateSemesterComparison(marks);
  const trend = semesterData.length >= 2 
    ? semesterData[semesterData.length - 1].average - semesterData[semesterData.length - 2].average
    : 0;

  return assessRiskLevel({
    currentGrade: avgGrade,
    attendanceRate: attendanceStats.overall,
    assignmentCompletion: 80, // Would need actual assignment data
    trendSlope: trend,
    previousGrades: recentMarks.map(m => m.totalMarks)
  });
}

function analyzeSemesterTrends(semesterData) {
  if (semesterData.length < 2) return { trend: 'stable', change: 0 };

  const recent = semesterData[semesterData.length - 1].average;
  const previous = semesterData[semesterData.length - 2].average;
  const change = recent - previous;

  return {
    trend: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
    change: Math.round(change * 10) / 10
  };
}

function calculateImprovement(semesterData) {
  if (semesterData.length < 2) return 0;
  
  const first = semesterData[0].average;
  const last = semesterData[semesterData.length - 1].average;
  
  return Math.round((last - first) * 10) / 10;
}

function analyzeRankTrend(historicalRanks) {
  if (historicalRanks.length < 2) return { trend: 'stable', change: 0 };

  const recent = historicalRanks[historicalRanks.length - 1].rank;
  const previous = historicalRanks[historicalRanks.length - 2].rank;
  const change = previous - recent; // Positive means improvement

  return {
    trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
    change
  };
}

function generateCorrelationInsights(overall, bySubject) {
  const insights = [];

  if (overall.relationship === 'positive') {
    insights.push({
      type: 'info',
      message: `${overall.strength} positive correlation found between attendance and performance`,
      recommendation: 'Regular attendance can help improve academic performance'
    });
  }

  const weakCorrelations = bySubject.filter(s => s.attendanceRate < 75);
  if (weakCorrelations.length > 0) {
    insights.push({
      type: 'warning',
      message: `Low attendance in ${weakCorrelations.length} subject(s)`,
      recommendation: 'Improve attendance in these subjects to boost performance'
    });
  }

  return insights;
}

function generateRecommendations(riskAssessment, predictions) {
  const recommendations = [];

  if (riskAssessment.riskLevel === 'high' || riskAssessment.riskLevel === 'critical') {
    recommendations.push({
      priority: 'high',
      action: riskAssessment.intervention,
      reason: 'High risk level detected'
    });
  }

  if (predictions.trend === 'declining') {
    recommendations.push({
      priority: 'medium',
      action: 'Review study methods and time management',
      reason: 'Declining performance trend'
    });
  }

  if (predictions.correlation.relationship === 'positive') {
    recommendations.push({
      priority: 'low',
      action: 'Maintain or improve attendance rate',
      reason: 'Strong attendance-performance correlation'
    });
  }

  return recommendations;
}

async function getTopPerformers(departmentId, semester, limit = 10) {
  const filter = { department: departmentId, role: 'student' };
  const students = await User.find(filter).select('name rollNumber');
  
  const marksFilter = { student: { $in: students.map(s => s._id) } };
  if (semester) marksFilter.semester = semester;

  const allMarks = await Marks.find(marksFilter).populate('student');

  const studentAverages = new Map();
  allMarks.forEach(mark => {
    const studentId = mark.student._id.toString();
    if (!studentAverages.has(studentId)) {
      studentAverages.set(studentId, {
        student: mark.student,
        scores: []
      });
    }
    studentAverages.get(studentId).scores.push(mark.totalMarks);
  });

  return Array.from(studentAverages.values())
    .map(data => ({
      name: data.student.name,
      rollNumber: data.student.rollNumber,
      average: data.scores.reduce((a, b) => a + b, 0) / data.scores.length
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, limit);
}

function calculateDepartmentSubjectPerformance(marks) {
  const subjectMap = new Map();

  marks.forEach(mark => {
    const subjectName = mark.subject?.name || 'Unknown';
    if (!subjectMap.has(subjectName)) {
      subjectMap.set(subjectName, []);
    }
    subjectMap.get(subjectName).push(mark.totalMarks);
  });

  return Array.from(subjectMap.entries()).map(([subject, scores]) => ({
    subject,
    average: scores.reduce((a, b) => a + b, 0) / scores.length,
    studentsAppeared: scores.length
  }));
}

function calculatePerformanceDistribution(marks) {
  const ranges = {
    '90-100': 0,
    '80-89': 0,
    '70-79': 0,
    '60-69': 0,
    '50-59': 0,
    '40-49': 0,
    'Below 40': 0
  };

  marks.forEach(mark => {
    const score = mark.totalMarks;
    if (score >= 90) ranges['90-100']++;
    else if (score >= 80) ranges['80-89']++;
    else if (score >= 70) ranges['70-79']++;
    else if (score >= 60) ranges['60-69']++;
    else if (score >= 50) ranges['50-59']++;
    else if (score >= 40) ranges['40-49']++;
    else ranges['Below 40']++;
  });

  return ranges;
}

function calculatePassPercentage(marks) {
  if (marks.length === 0) return 0;
  const passed = marks.filter(m => m.totalMarks >= 40).length;
  return (passed / marks.length) * 100;
}

function calculateCGPA(marks) {
  // Simplified CGPA calculation
  const average = marks.reduce((sum, m) => sum + m.totalMarks, 0) / marks.length;
  return (average / 10).toFixed(2);
}

function getGrade(marks) {
  if (marks >= 90) return 'A+';
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B+';
  if (marks >= 60) return 'B';
  if (marks >= 50) return 'C';
  if (marks >= 40) return 'D';
  return 'F';
}

module.exports = exports;
