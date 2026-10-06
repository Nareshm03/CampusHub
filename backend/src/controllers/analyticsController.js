const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Student = require('../models/Student');
const Homework = require('../models/Homework');
const Submission = require('../models/Submission');
const mongoose = require('mongoose');
const {
  predictPerformance,
  calculateCorrelation,
  assessRiskLevel,
  generateInsights,
  calculatePercentile,
  identifyWeakSubjects,
  movingAverage
} = require('../utils/predictiveAnalytics');

// Marks rows store raw `marks`/`maxMarks`. All analytics use percentage scale.
// Grade bands follow the application's import grading rule
// (O >= 90, A+ >= 80, A >= 70, B+ >= 60, B >= 50, C >= 40, F otherwise).
const safePercentageOf = (marks, maxMarks) => {
  const max = Number(maxMarks) || 0;
  if (max <= 0) return 0;
  return (Number(marks) || 0) / max * 100;
};

const gradeForPercentage = (pct) => {
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  return 'F';
};

// Academic records live on the Student profile, not the User document.
const resolveStudentId = async (userId) => {
  const profile = await Student.findOne({ userId });
  return profile ? profile._id : null;
};

const isUsableFilterValue = (v) => v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'undefined' && v !== 'null';

const parseSemesterFilter = (semester) => {
  if (!isUsableFilterValue(semester)) return null;
  const sem = parseInt(semester, 10);
  return Number.isInteger(sem) && sem >= 1 && sem <= 8 ? sem : null;
};

// Ownership: students may only query their own analytics. Faculty/admin may
// query any student by Student profile id. Returns the target Student _id or
// sends the error response and returns null.
const resolveTargetStudent = async (req, res) => {
  const { studentId } = req.query;
  if (req.user.role === 'STUDENT') {
    const ownId = await resolveStudentId(req.user._id);
    if (!ownId) {
      res.status(404).json({ success: false, message: 'Student profile not found' });
      return null;
    }
    if (isUsableFilterValue(studentId) && studentId.toString() !== ownId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. You can only view your own analytics.' });
      return null;
    }
    return ownId;
  }
  if (isUsableFilterValue(studentId)) {
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      res.status(400).json({ success: false, message: 'Invalid student ID format' });
      return null;
    }
    const target = await Student.findById(studentId);
    if (!target) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return null;
    }
    return target._id;
  }
  const ownId = await resolveStudentId(req.user._id);
  if (!ownId) {
    res.status(404).json({ success: false, message: 'Student profile not found' });
    return null;
  }
  return ownId;
};

/**
 * Get comprehensive dashboard analytics
 */
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const { departmentId, semester } = req.query;
    const targetStudentId = await resolveTargetStudent(req, res);
    if (!targetStudentId) return;

    // Fetch student profile (name lives on User, usn/department on Student)
    const student = await Student.findById(targetStudentId)
      .populate('userId', 'name')
      .populate('department', 'name');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const semesterFilter = parseSemesterFilter(semester);

    // Fetch marks and attendance for the target student only
    let marks = await Marks.find({ student: targetStudentId })
      .populate('subject', 'name subjectCode semester credits')
      .sort({ createdAt: 1 });
    if (semesterFilter) {
      marks = marks.filter((m) => m.subject && m.subject.semester === semesterFilter);
    }

    const attendance = await Attendance.find({ student: targetStudentId })
      .populate('subject', 'name')
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
    const rankData = await calculateRank(targetStudentId, departmentId || student.department?._id || student.department);

    // Correlation analysis
    const correlationData = analyzeAttendancePerformance(marks, attendance);

    // Predictive analytics
    const prediction = await generatePredictions(targetStudentId, marks, attendance);

    res.json({
      success: true,
      data: {
        student: {
          name: student.userId?.name || 'Unknown',
          usn: student.usn,
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
    const targetStudentId = await resolveTargetStudent(req, res);
    if (!targetStudentId) return;

    const marks = await Marks.find({ student: targetStudentId })
      .populate('subject', 'name subjectCode semester credits')
      .sort({ createdAt: 1 });

    const semesterData = calculateSemesterComparison(marks);
    const trendAnalysis = analyzeSemesterTrends(semesterData);

    res.json({
      success: true,
      data: {
        semesters: semesterData,
        trends: trendAnalysis,
        bestSemester: semesterData.length > 0
          ? semesterData.reduce((best, curr) => (curr.average > best.average ? curr : best))
          : null,
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
    const { semester } = req.query;
    const targetStudentId = await resolveTargetStudent(req, res);
    if (!targetStudentId) return;

    const semesterFilter = parseSemesterFilter(semester);

    let marks = await Marks.find({ student: targetStudentId })
      .populate('subject', 'name subjectCode semester credits');
    if (semesterFilter) {
      marks = marks.filter((m) => m.subject && m.subject.semester === semesterFilter);
    }
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
          averageScore: subjectData.length > 0
            ? subjectData.reduce((sum, s) => sum + s.average, 0) / subjectData.length
            : 0,
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
    const { departmentId, semester } = req.query;
    const targetStudentId = await resolveTargetStudent(req, res);
    if (!targetStudentId) return;

    const profile = await Student.findById(targetStudentId).select('department');
    const scopeDepartment = departmentId || profile?.department;
    if (!isUsableFilterValue(scopeDepartment) || !mongoose.Types.ObjectId.isValid(scopeDepartment)) {
      return res.status(400).json({ success: false, message: 'A valid department scope is required for rank tracking' });
    }
    const semesterFilter = parseSemesterFilter(semester);

    const rankData = await calculateRank(targetStudentId, scopeDepartment, semesterFilter);
    const historicalRanks = await getHistoricalRanks(targetStudentId, scopeDepartment);
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
    const targetStudentId = await resolveTargetStudent(req, res);
    if (!targetStudentId) return;

    const marks = await Marks.find({ student: targetStudentId })
      .populate('subject', 'name subjectCode semester credits');
    const attendance = await Attendance.find({ student: targetStudentId })
      .populate('subject', 'name');

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
    const targetStudentId = await resolveTargetStudent(req, res);
    if (!targetStudentId) return;

    const marks = await Marks.find({ student: targetStudentId })
      .populate('subject', 'name subjectCode semester credits')
      .sort({ createdAt: 1 });

    const attendance = await Attendance.find({ student: targetStudentId })
      .sort({ date: 1 });

    const predictions = await generatePredictions(targetStudentId, marks, attendance);
    const riskAssessment = await assessStudentRisk(targetStudentId, marks, attendance);
    const insights = generateInsights({
      grades: marks.map((m) => ({ value: safePercentageOf(m.marks, m.maxMarks), label: m.subject?.name })),
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

    if (!isUsableFilterValue(departmentId) || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ success: false, message: 'A valid departmentId is required' });
    }
    const semesterFilter = parseSemesterFilter(semester);

    // Get all student profiles in department
    const students = await Student.find({ department: departmentId });

    const studentIds = students.map(s => s._id);

    // Get marks for all students (semester lives on Subject, filter after populate)
    let marks = await Marks.find({
      student: { $in: studentIds }
    }).populate('subject', 'name subjectCode semester credits');
    if (semesterFilter) {
      marks = marks.filter((m) => m.subject && m.subject.semester === semesterFilter);
    }

    // Calculate department statistics
    const departmentStats = {
      totalStudents: students.length,
      averagePerformance: marks.length > 0
        ? marks.reduce((sum, m) => sum + safePercentageOf(m.marks, m.maxMarks), 0) / marks.length
        : 0,
      topPerformers: await getTopPerformers(departmentId, semesterFilter, 10),
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
    return { average: 0, highest: 0, lowest: 0, total: 0, cgpa: 0 };
  }

  const scores = marks.map(m => safePercentageOf(m.marks, m.maxMarks));
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
    const subjectId = mark.subject?._id?.toString() || 'unknown';
    const subjectName = mark.subject?.name || 'Unknown';

    if (!subjectMap.has(subjectId)) {
      subjectMap.set(subjectId, {
        name: subjectName,
        scores: [],
        exams: []
      });
    }

    const pct = safePercentageOf(mark.marks, mark.maxMarks);
    subjectMap.get(subjectId).scores.push(pct);
    subjectMap.get(subjectId).exams.push({
      type: mark.examType,
      examName: mark.examName,
      score: Math.round(pct * 10) / 10,
      date: mark.createdAt
    });
  });

  return Array.from(subjectMap.values()).map(subject => {
    const average = subject.scores.reduce((a, b) => a + b, 0) / subject.scores.length;
    const highest = Math.max(...subject.scores);
    const lowest = Math.min(...subject.scores);

    return {
      name: subject.name,
      average: Math.round(average * 10) / 10,
      highest: Math.round(highest * 10) / 10,
      lowest: Math.round(lowest * 10) / 10,
      totalExams: subject.exams.length,
      exams: subject.exams,
      grade: gradeForPercentage(average)
    };
  });
}

function calculateSemesterComparison(marks) {
  const semesterMap = new Map();

  marks.forEach(mark => {
    const sem = mark.subject?.semester || 'Unknown';

    if (!semesterMap.has(sem)) {
      semesterMap.set(sem, { scores: [], subjects: new Set() });
    }

    semesterMap.get(sem).scores.push(safePercentageOf(mark.marks, mark.maxMarks));
    if (mark.subject?.name) semesterMap.get(sem).subjects.add(mark.subject.name);
  });

  return Array.from(semesterMap.entries())
    .map(([semester, data]) => ({
      semester,
      average: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10,
      totalSubjects: data.subjects.size,
      totalExams: data.scores.length,
      highest: Math.round(Math.max(...data.scores) * 10) / 10,
      lowest: Math.round(Math.min(...data.scores) * 10) / 10
    }))
    .sort((a, b) => a.semester - b.semester);
}

function calculateAttendanceStats(attendance) {
  if (attendance.length === 0) {
    return { overall: 0, present: 0, late: 0, absent: 0, total: 0, bySubject: [] };
  }

  const present = attendance.filter(a => a.status === 'PRESENT').length;
  const late = attendance.filter(a => a.status === 'LATE').length;
  const absent = attendance.filter(a => a.status === 'ABSENT').length;
  const total = attendance.length;
  const overallPercentage = (present / total) * 100;

  // Subject-wise attendance
  const subjectMap = new Map();
  attendance.forEach(att => {
    const subjectName = att.subject?.name || 'Unknown';
    if (!subjectMap.has(subjectName)) {
      subjectMap.set(subjectName, { present: 0, late: 0, total: 0 });
    }
    subjectMap.get(subjectName).total++;
    if (att.status === 'PRESENT') {
      subjectMap.get(subjectName).present++;
    } else if (att.status === 'LATE') {
      subjectMap.get(subjectName).late++;
    }
  });

  const bySubject = Array.from(subjectMap.entries()).map(([subject, data]) => ({
    subject,
    percentage: Math.round((data.present / data.total) * 1000) / 10,
    present: data.present,
    late: data.late,
    total: data.total
  }));

  return {
    overall: Math.round(overallPercentage * 10) / 10,
    present,
    late,
    absent,
    total,
    bySubject
  };
}

async function calculateRank(targetStudentId, departmentId, semesterFilter) {
  const students = await Student.find({ department: departmentId }).select('_id');

  let allMarks = await Marks.find({
    student: { $in: students.map(s => s._id) }
  }).populate('subject', 'semester');

  if (semesterFilter) {
    allMarks = allMarks.filter((m) => m.subject && m.subject.semester === semesterFilter);
  }

  // Calculate average percentage for each student
  const studentAverages = new Map();
  allMarks.forEach(mark => {
    const sid = mark.student.toString();
    if (!studentAverages.has(sid)) {
      studentAverages.set(sid, []);
    }
    studentAverages.get(sid).push(safePercentageOf(mark.marks, mark.maxMarks));
  });

  const rankings = Array.from(studentAverages.entries())
    .map(([studentId, scores]) => ({
      studentId,
      average: scores.reduce((a, b) => a + b, 0) / scores.length
    }))
    .sort((a, b) => b.average - a.average);

  const userRankIndex = rankings.findIndex(r => r.studentId === targetStudentId.toString());
  const rank = userRankIndex + 1;
  const percentile = calculatePercentile(
    rankings[userRankIndex]?.average || 0,
    rankings.map(r => r.average)
  );

  return {
    rank: userRankIndex >= 0 ? rank : 0,
    totalStudents: rankings.length,
    percentile,
    average: rankings[userRankIndex]?.average || 0,
    topScore: rankings[0]?.average || 0
  };
}

async function getHistoricalRanks(targetStudentId, departmentId) {
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  const history = [];

  for (const sem of semesters) {
    try {
      const rankData = await calculateRank(targetStudentId, departmentId, sem);
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
    const subjectId = mark.subject?._id?.toString() || 'unknown';
    if (!subjectData.has(subjectId)) {
      subjectData.set(subjectId, { marks: [], attendance: [] });
    }
    subjectData.get(subjectId).marks.push(safePercentageOf(mark.marks, mark.maxMarks));
  });

  attendance.forEach(att => {
    const subjectId = att.subject?._id?.toString() || 'unknown';
    if (subjectData.has(subjectId)) {
      subjectData.get(subjectId).attendance.push(att.status === 'PRESENT' ? 1 : 0);
    }
  });

  // Calculate overall correlation (only subjects having both signals)
  const allMarks = [];
  const allAttendance = [];

  subjectData.forEach(data => {
    if (data.marks.length === 0 || data.attendance.length === 0) return;
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
    if (att.status === 'PRESENT') {
      attendanceBySubject.get(subjectName).present++;
    }
  });

  const rows = Array.from(subjectMap.keys()).map(subject => {
    const marksData = marks
      .filter(m => m.subject?.name === subject)
      .map(m => safePercentageOf(m.marks, m.maxMarks));

    const attData = attendanceBySubject.get(subject);
    const attRate = attData && attData.total > 0 ? (attData.present / attData.total) * 100 : 0;

    return {
      subject,
      averageMarks: marksData.length > 0
        ? Math.round((marksData.reduce((a, b) => a + b, 0) / marksData.length) * 10) / 10
        : 0,
      attendanceRate: Math.round(attRate * 10) / 10
    };
  });

  // Pearson correlation across subjects that carry both signals
  const xs = [];
  const ys = [];
  rows.forEach((r) => {
    const att = attendanceBySubject.get(r.subject);
    if (att && att.total > 0) {
      xs.push(r.attendanceRate);
      ys.push(r.averageMarks);
    }
  });
  const overall = calculateCorrelation(xs, ys);

  return rows.map((r) => ({ ...r, correlation: xs.length >= 2 ? overall : null }));
}

async function generatePredictions(targetStudentId, marks, attendance) {
  const semesterData = calculateSemesterComparison(marks).filter((s) => typeof s.semester === 'number');
  const historicalGrades = semesterData.map((sem) => ({ value: sem.average, label: `Sem ${sem.semester}` }));

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

async function assessStudentRisk(targetStudentId, marks, attendance) {
  const recentMarks = marks.slice(-5);
  const recentPercentages = recentMarks.map((m) => safePercentageOf(m.marks, m.maxMarks));
  const avgGrade = recentPercentages.length > 0
    ? recentPercentages.reduce((sum, v) => sum + v, 0) / recentPercentages.length
    : 0;

  const attendanceStats = calculateAttendanceStats(attendance);
  const semesterData = calculateSemesterComparison(marks).filter((s) => typeof s.semester === 'number');
  const trend = semesterData.length >= 2
    ? semesterData[semesterData.length - 1].average - semesterData[semesterData.length - 2].average
    : 0;

  // Real assignment completion: submissions by this user vs homeworks issued
  // to their department (both persisted collections, no fabricated default).
  let assignmentCompletion = 0;
  try {
    const profile = await Student.findById(targetStudentId).select('department userId');
    const deptHomeworks = profile?.department
      ? await Homework.find({ department: profile.department }).select('_id')
      : [];
    if (deptHomeworks.length > 0 && profile?.userId) {
      const submitted = await Submission.countDocuments({
        homework: { $in: deptHomeworks.map((h) => h._id) },
        student: profile.userId
      });
      assignmentCompletion = Math.min(100, (submitted / deptHomeworks.length) * 100);
    }
  } catch (err) {
    console.error('Assignment completion lookup error:', err);
  }

  return assessRiskLevel({
    currentGrade: avgGrade,
    attendanceRate: attendanceStats.overall,
    assignmentCompletion,
    trendSlope: trend,
    previousGrades: recentPercentages
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

async function getTopPerformers(departmentId, semesterFilter, limit = 10) {
  const students = await Student.find({ department: departmentId })
    .populate('userId', 'name');

  let allMarks = await Marks.find({
    student: { $in: students.map(s => s._id) }
  }).populate('subject', 'semester');
  if (semesterFilter) {
    allMarks = allMarks.filter((m) => m.subject && m.subject.semester === semesterFilter);
  }

  const studentAverages = new Map();
  allMarks.forEach(mark => {
    const sid = mark.student.toString();
    if (!studentAverages.has(sid)) {
      studentAverages.set(sid, { scores: [] });
    }
    studentAverages.get(sid).scores.push(safePercentageOf(mark.marks, mark.maxMarks));
  });

  const nameById = new Map(students.map((s) => [s._id.toString(), { name: s.userId?.name || 'Unknown', usn: s.usn }]));

  return Array.from(studentAverages.entries())
    .map(([sid, data]) => ({
      name: nameById.get(sid)?.name || 'Unknown',
      usn: nameById.get(sid)?.usn || '',
      average: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10
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
    subjectMap.get(subjectName).push(safePercentageOf(mark.marks, mark.maxMarks));
  });

  return Array.from(subjectMap.entries()).map(([subject, scores]) => ({
    subject,
    average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
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
    const score = safePercentageOf(mark.marks, mark.maxMarks);
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
  const passed = marks.filter(m => safePercentageOf(m.marks, m.maxMarks) >= 40).length;
  return (passed / marks.length) * 100;
}

function calculateCGPA(marks) {
  // CGPA on the application's 10-point scale (avg percentage / 9.5, capped at 10),
  // consistent with academic reports.
  if (marks.length === 0) return 0;
  const average = marks.reduce((sum, m) => sum + safePercentageOf(m.marks, m.maxMarks), 0) / marks.length;
  return Math.round(Math.min(10, average / 9.5) * 100) / 100;
}

// Legacy alias kept for internal callers: application grade bands.
function getGrade(percentage) {
  return gradeForPercentage(percentage);
}

module.exports = exports;
