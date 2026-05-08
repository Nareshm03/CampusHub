const Marks = require('../models/Marks');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

// @desc    Calculate GPA/CGPA for student
// @route   GET /api/v1/grades/calculate/:studentId
// @access  Private
const calculateGrades = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { semester } = req.query;

    let query = { student: studentId };
    if (semester) query['subject.semester'] = parseInt(semester);

    const marks = await Marks.find(query)
      .populate('subject', 'credits semester');

    const semesterGrades = {};
    let totalCredits = 0;
    let totalGradePoints = 0;

    marks.forEach(mark => {
      const sem = mark.subject.semester;
      const credits = mark.subject.credits || 4;
      const totalMarks = (mark.internal1 + mark.internal2 + mark.internal3) / 3;
      const gradePoint = getGradePoint(totalMarks);

      if (!semesterGrades[sem]) {
        semesterGrades[sem] = { credits: 0, gradePoints: 0, subjects: [] };
      }

      semesterGrades[sem].credits += credits;
      semesterGrades[sem].gradePoints += gradePoint * credits;
      semesterGrades[sem].subjects.push({
        subject: mark.subject.name,
        marks: totalMarks,
        grade: getGrade(totalMarks),
        gradePoint,
        credits
      });

      totalCredits += credits;
      totalGradePoints += gradePoint * credits;
    });

    Object.keys(semesterGrades).forEach(sem => {
      const semData = semesterGrades[sem];
      semData.gpa = semData.credits > 0 ? (semData.gradePoints / semData.credits).toFixed(2) : 0;
    });

    const cgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0;

    res.success({
      cgpa: parseFloat(cgpa),
      totalCredits,
      semesterGrades
    }, 'Grades calculated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Generate transcript
// @route   GET /api/v1/grades/transcript/:studentId
// @access  Private
const generateTranscript = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findById(studentId)
      .populate('userId', 'name email')
      .populate('department', 'name');

    const marks = await Marks.find({ student: studentId })
      .populate('subject', 'name subjectCode credits semester')
      .sort({ 'subject.semester': 1 });

    const transcript = {
      student: {
        name: student.userId.name,
        usn: student.usn,
        department: student.department.name,
        admissionYear: student.admissionYear
      },
      semesters: {}
    };

    marks.forEach(mark => {
      const sem = mark.subject.semester;
      const totalMarks = (mark.internal1 + mark.internal2 + mark.internal3) / 3;
      
      if (!transcript.semesters[sem]) {
        transcript.semesters[sem] = { subjects: [], totalCredits: 0, gpa: 0 };
      }

      transcript.semesters[sem].subjects.push({
        code: mark.subject.subjectCode,
        name: mark.subject.name,
        credits: mark.subject.credits,
        marks: totalMarks.toFixed(1),
        grade: getGrade(totalMarks)
      });
    });

    res.success(transcript, 'Transcript generated successfully');
  } catch (error) {
    next(error);
  }
};

const getGradePoint = (marks) => {
  if (marks >= 90) return 10;
  if (marks >= 80) return 9;
  if (marks >= 70) return 8;
  if (marks >= 60) return 7;
  if (marks >= 50) return 6;
  if (marks >= 40) return 5;
  return 0;
};

const getGrade = (marks) => {
  if (marks >= 90) return 'S';
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B';
  if (marks >= 60) return 'C';
  if (marks >= 50) return 'D';
  if (marks >= 40) return 'E';
  return 'F';
};

// @desc    Calculate grades for logged-in student
// @route   GET /api/grades/calculate/me
// @access  Private/Student
const calculateMyGrades = async (req, res, next) => {
  try {
    const { semester } = req.query;

    // Find student by userId
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    let query = { student: student._id };
    if (semester) {
      // We need to populate subject to filter by semester
      const marks = await Marks.find(query)
        .populate('subject', 'credits semester name subjectCode');
      
      const filteredMarks = marks.filter(mark => 
        mark.subject && mark.subject.semester === parseInt(semester)
      );
      
      return calculateAndReturnGrades(filteredMarks, res);
    }

    const marks = await Marks.find(query)
      .populate('subject', 'credits semester name subjectCode');

    return calculateAndReturnGrades(marks, res);
  } catch (error) {
    next(error);
  }
};

const calculateAndReturnGrades = (marks, res) => {
  // Group all mark rows by subject so we can pick the best available score
  const subjectMap = {};
  marks.forEach(mark => {
    if (!mark.subject) return;
    const sid = mark.subject._id.toString();
    if (!subjectMap[sid]) {
      subjectMap[sid] = {
        subject: mark.subject,
        external: null,
        internalRows: [],
        legacyInternal: [mark.internal1 || 0, mark.internal2 || 0, mark.internal3 || 0]
      };
    }
    const entry = subjectMap[sid];
    if (mark.examType === 'EXTERNAL' && mark.marks != null) {
      // Use percentage of external marks out of maxMarks
      const pct = mark.maxMarks > 0 ? (mark.marks / mark.maxMarks) * 100 : mark.marks;
      entry.external = pct;
    } else if (mark.examType === 'INTERNAL' && mark.marks != null) {
      entry.internalRows.push({ marks: mark.marks, maxMarks: mark.maxMarks || 50 });
    }
    // Accumulate legacy fields
    if (mark.internal1 > 0) entry.legacyInternal[0] = mark.internal1;
    if (mark.internal2 > 0) entry.legacyInternal[1] = mark.internal2;
    if (mark.internal3 > 0) entry.legacyInternal[2] = mark.internal3;
  });

  const semesterGrades = {};
  let totalCredits = 0;
  let totalGradePoints = 0;

  Object.values(subjectMap).forEach(({ subject, external, internalRows, legacyInternal }) => {
    const sem = subject.semester;
    const credits = subject.credits || 4;

    // Determine the score to grade on (0-100 scale)
    let scoreForGrade;
    if (external !== null) {
      scoreForGrade = external;
    } else if (internalRows.length > 0) {
      const avg = internalRows.reduce((s, r) => s + (r.maxMarks > 0 ? (r.marks / r.maxMarks) * 100 : r.marks), 0) / internalRows.length;
      scoreForGrade = avg;
    } else {
      const nonZero = legacyInternal.filter(v => v > 0);
      scoreForGrade = nonZero.length > 0 ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
    }

    const gradePoint = getGradePoint(scoreForGrade);

    if (!semesterGrades[sem]) {
      semesterGrades[sem] = { credits: 0, gradePoints: 0, subjects: [] };
    }
    semesterGrades[sem].credits += credits;
    semesterGrades[sem].gradePoints += gradePoint * credits;
    semesterGrades[sem].subjects.push({
      subjectCode: subject.subjectCode || '',
      subject: subject.name,
      credits,
      marks: parseFloat(scoreForGrade.toFixed(2)),
      grade: getGrade(scoreForGrade),
      gradePoint
    });
    totalCredits += credits;
    totalGradePoints += gradePoint * credits;
  });

  Object.keys(semesterGrades).forEach(sem => {
    const d = semesterGrades[sem];
    d.sgpa = d.credits > 0 ? parseFloat((d.gradePoints / d.credits).toFixed(2)) : 0;
    // keep legacy key too
    d.gpa = d.sgpa;
  });

  const cgpa = totalCredits > 0 ? parseFloat((totalGradePoints / totalCredits).toFixed(2)) : 0;

  res.status(200).json({
    success: true,
    data: { cgpa, totalCredits, semesterGrades }
  });
};

module.exports = {
  calculateGrades,
  generateTranscript,
  calculateMyGrades
};