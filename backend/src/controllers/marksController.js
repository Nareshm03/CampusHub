const Marks = require('../models/Marks');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const { validate, marksValidation } = require('../middleware/validation');
const AuditLogger = require('../utils/auditLogger');

// @desc    Enter marks for multiple students
// @route   POST /api/marks/entry
// @access  Private/Faculty
const enterMarks = async (req, res, next) => {
  try {
    const { marks } = req.body;
    
    if (!marks || !Array.isArray(marks)) {
      return res.status(400).json({
        success: false,
        error: 'Marks data must be an array'
      });
    }

    const results = [];
    
    for (const record of marks) {
      const { studentId, subjectId, examType, examName, marks: studentMarks, maxMarks, grade } = record;
      
      // Check if marks already exist for this exam
      const existingMarks = await Marks.findOne({
        student: studentId,
        subject: subjectId,
        examType,
        examName
      });

      if (existingMarks) {
        // Capture before state for audit
        const beforeState = {
          marks: existingMarks.marks,
          maxMarks: existingMarks.maxMarks,
          grade: existingMarks.grade
        };
        
        // Update existing marks
        existingMarks.marks = studentMarks;
        existingMarks.maxMarks = maxMarks;
        existingMarks.grade = grade;
        existingMarks.enteredBy = req.user.id;
        
        // Also update legacy fields for internal exams and assignments
        if (examType === 'INTERNAL') {
          if (examName === 'Internal 1') existingMarks.internal1 = studentMarks;
          else if (examName === 'Internal 2') existingMarks.internal2 = studentMarks;
          else if (examName === 'Internal 3') existingMarks.internal3 = studentMarks;
        } else if (examType === 'ASSIGNMENT') {
          if (examName === 'Assignment 1') existingMarks.assignment1 = studentMarks;
          else if (examName === 'Assignment 2') existingMarks.assignment2 = studentMarks;
          else if (examName === 'Alternative Assignment 1') existingMarks.altAssignment1 = studentMarks;
          else if (examName === 'Alternative Assignment 2') existingMarks.altAssignment2 = studentMarks;
        }
        
        await existingMarks.save();
        results.push(existingMarks);
        
        // Audit log for marks update
        await AuditLogger.logMarksAction('MARKS_UPDATED', req.user, {
          entityId: existingMarks._id,
          affectedUser: studentId,
          subject: subjectId,
          changes: {
            before: beforeState,
            after: { marks: studentMarks, maxMarks, grade }
          },
          metadata: { examType, examName },
          req
        });
      } else {
        // Create new marks record
        const markData = {
          student: studentId,
          subject: subjectId,
          examType,
          examName,
          marks: studentMarks,
          maxMarks,
          grade,
          enteredBy: req.user.id
        };
        
        // Also populate legacy fields for internal exams and assignments
        if (examType === 'INTERNAL') {
          if (examName === 'Internal 1') markData.internal1 = studentMarks;
          else if (examName === 'Internal 2') markData.internal2 = studentMarks;
          else if (examName === 'Internal 3') markData.internal3 = studentMarks;
        } else if (examType === 'ASSIGNMENT') {
          if (examName === 'Assignment 1') markData.assignment1 = studentMarks;
          else if (examName === 'Assignment 2') markData.assignment2 = studentMarks;
          else if (examName === 'Alternative Assignment 1') markData.altAssignment1 = studentMarks;
          else if (examName === 'Alternative Assignment 2') markData.altAssignment2 = studentMarks;
        }
        
        const newMarks = await Marks.create(markData);
        results.push(newMarks);
        
        // Audit log for marks creation
        await AuditLogger.logMarksAction('MARKS_CREATED', req.user, {
          entityId: newMarks._id,
          affectedUser: studentId,
          subject: subjectId,
          changes: {
            after: { marks: studentMarks, maxMarks, grade }
          },
          metadata: { examType, examName },
          req
        });
      }
    }

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('enterMarks error:', error.name, error.message);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    next(error);
  }
};

// @desc    Add or update internal marks
// @route   POST /api/marks
// @access  Private/Faculty
const addOrUpdateMarks = async (req, res, next) => {
  try {
    const { student, subject, internal1, internal2 } = req.body;

    // Validate student exists
    const studentExists = await Student.findById(student);
    if (!studentExists) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Validate subject exists
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    // Find existing marks for audit trail
    const existingMarks = await Marks.findOne({ student, subject });
    
    const marks = await Marks.findOneAndUpdate(
      { student, subject },
      { internal1, internal2 },
      { new: true, upsert: true, runValidators: true }
    ).populate('student', 'usn')
     .populate('subject', 'name subjectCode');

    // Audit log
    await AuditLogger.logMarksAction(
      existingMarks ? 'MARKS_UPDATED' : 'MARKS_CREATED',
      req.user,
      {
        entityId: marks._id,
        affectedUser: student,
        subject,
        changes: {
          before: existingMarks ? { internal1: existingMarks.internal1, internal2: existingMarks.internal2 } : {},
          after: { internal1, internal2 }
        },
        req
      }
    );

    res.status(200).json({
      success: true,
      data: marks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my marks
// @route   GET /api/marks/me
// @access  Private/Student
const getMyMarks = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    const subjectFilter = {};
    if (req.query.semester) subjectFilter.semester = parseInt(req.query.semester);

    let subjectIds;
    if (req.query.semester) {
      const Subject = require('../models/Subject');
      const subjects = await Subject.find(subjectFilter).select('_id');
      subjectIds = subjects.map(s => s._id);
    }

    const marksQuery = subjectIds
      ? { student: student._id, subject: { $in: subjectIds } }
      : { student: student._id };

    const marks = await Marks.find(marksQuery)
      .populate('subject', 'name subjectCode semester code')
      .sort({ 'subject.semester': 1 });

    // Group marks by subject and convert new format to old format
    const subjectMarksMap = {};
    
    marks.forEach(mark => {
      const subjectId = mark.subject._id.toString();
      
      if (!subjectMarksMap[subjectId]) {
        subjectMarksMap[subjectId] = {
          _id: mark._id,
          subject: mark.subject,
          student: mark.student,
          internal1: 0,
          internal2: 0,
          internal3: 0,
          assignment1: 0,
          assignment2: 0,
          altAssignment1: 0,
          altAssignment2: 0,
          createdAt: mark.createdAt,
          updatedAt: mark.updatedAt
        };
      }
      
      // Map new format exams to old internal fields
      if (mark.examType === 'INTERNAL') {
        if (mark.examName === 'Internal 1' || mark.examName === 'internal1') {
          subjectMarksMap[subjectId].internal1 = mark.marks || 0;
        } else if (mark.examName === 'Internal 2' || mark.examName === 'internal2') {
          subjectMarksMap[subjectId].internal2 = mark.marks || 0;
        } else if (mark.examName === 'Internal 3' || mark.examName === 'internal3') {
          subjectMarksMap[subjectId].internal3 = mark.marks || 0;
        }
      } else if (mark.examType === 'EXTERNAL') {
        subjectMarksMap[subjectId].external = (subjectMarksMap[subjectId].external || 0) + (mark.marks || 0);
        subjectMarksMap[subjectId].externalMax = (subjectMarksMap[subjectId].externalMax || 0) + (mark.maxMarks || 100);
      } else if (mark.examType === 'ASSIGNMENT') {
        if (mark.examName === 'Assignment 1') {
          subjectMarksMap[subjectId].assignment1 = mark.marks || 0;
        } else if (mark.examName === 'Assignment 2') {
          subjectMarksMap[subjectId].assignment2 = mark.marks || 0;
        } else if (mark.examName === 'Alternative Assignment 1') {
          subjectMarksMap[subjectId].altAssignment1 = mark.marks || 0;
        } else if (mark.examName === 'Alternative Assignment 2') {
          subjectMarksMap[subjectId].altAssignment2 = mark.marks || 0;
        }
      }
      
      // Also include legacy data if available
      if (mark.internal1 > 0) subjectMarksMap[subjectId].internal1 = mark.internal1;
      if (mark.internal2 > 0) subjectMarksMap[subjectId].internal2 = mark.internal2;
      if (mark.internal3 > 0) subjectMarksMap[subjectId].internal3 = mark.internal3;
      if (mark.external > 0) subjectMarksMap[subjectId].external = mark.external;
      if (mark.assignment1 > 0) subjectMarksMap[subjectId].assignment1 = mark.assignment1;
      if (mark.assignment2 > 0) subjectMarksMap[subjectId].assignment2 = mark.assignment2;
      if (mark.altAssignment1 > 0) subjectMarksMap[subjectId].altAssignment1 = mark.altAssignment1;
      if (mark.altAssignment2 > 0) subjectMarksMap[subjectId].altAssignment2 = mark.altAssignment2;
    });

    const enhancedMarks = Object.values(subjectMarksMap).map(mark => {
      const average = (mark.internal1 + mark.internal2 + mark.internal3) / 3;
      const status = average >= 20 ? 'SAFE' : 'AT_RISK';
      
      return {
        ...mark,
        average: Math.round(average * 100) / 100,
        status
      };
    });

    res.status(200).json({
      success: true,
      count: enhancedMarks.length,
      data: enhancedMarks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get marks by subject
// @route   GET /api/marks/subject/:subjectId
// @access  Private/Faculty/Admin
const getMarksBySubject = async (req, res, next) => {
  try {
    const { subjectId } = req.params;

    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    const marks = await Marks.find({ subject: subjectId })
      .populate('student', 'usn userId')
      .populate('subject', 'name subjectCode semester')
      .sort({ 'student.usn': 1 });

    res.status(200).json({
      success: true,
      count: marks.length,
      data: marks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate GPA for a student
// @route   GET /api/marks/gpa/:studentId
// @access  Private
const calculateGPA = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    const marks = await Marks.find({ student: studentId })
      .populate('subject', 'credits');

    let totalCredits = 0;
    let totalGradePoints = 0;

    // Group records by subject to aggregate across new-format rows
    const subjectMap = new Map();
    marks.forEach(mark => {
      const subjectId = mark.subject._id.toString();
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, { credits: mark.subject.credits || 4, newTotal: 0, hasNew: false, legacy: mark });
      }
      
      const subjectData = subjectMap.get(subjectId);
      if (mark.examType && mark.marks != null) {
        subjectData.hasNew = true;
        subjectData.newTotal += mark.marks;
      }
    });

    subjectMap.forEach(({ credits, newTotal, hasNew, legacy }) => {
      let totalMarks;
      if (hasNew) {
        totalMarks = newTotal;
      } else {
        // Fall back to legacy fields
        const legacyScores = [legacy.internal1, legacy.internal2, legacy.internal3].filter(v => v > 0);
        totalMarks = legacyScores.length > 0
          ? legacyScores.reduce((a, b) => a + b, 0) / legacyScores.length
          : 0;
      }
      const gradePoint = getGradePoint(totalMarks);
      totalCredits += credits;
      totalGradePoints += gradePoint * credits;
    });

    const gpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: {
        gpa: parseFloat(gpa),
        totalCredits,
        subjects: subjectMap.size
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to convert marks to grade points
const getGradePoint = (marks) => {
  if (marks >= 90) return 10;
  if (marks >= 80) return 9;
  if (marks >= 70) return 8;
  if (marks >= 60) return 7;
  if (marks >= 50) return 6;
  if (marks >= 40) return 5;
  return 0;
};

// @desc    Get marks by student ID
// @route   GET /api/marks/student/:studentId
// @access  Private
const getMarksByStudent = async (req, res, next) => {
  try {
    // Check if parent is accessing their linked child's data
    if (req.user.role === 'PARENT') {
      const Parent = require('../models/Parent');
      const parent = await Parent.findOne({ userId: req.user.id });
      if (!parent || parent.linkedStudent?.toString() !== req.params.studentId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only view your linked child\'s marks.'
        });
      }
    }
    
    const student = await Student.findById(req.params.studentId);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    const subjectFilter = {};
    if (req.query.semester) subjectFilter.semester = parseInt(req.query.semester);

    let subjectIds;
    if (req.query.semester) {
      const Subject = require('../models/Subject');
      const subjects = await Subject.find(subjectFilter).select('_id');
      subjectIds = subjects.map(s => s._id);
    }

    const marksQuery = subjectIds
      ? { student: student._id, subject: { $in: subjectIds } }
      : { student: student._id };

    const marks = await Marks.find(marksQuery)
      .populate('subject', 'name subjectCode semester code')
      .sort({ 'subject.semester': 1 });

    // Group marks by subject and convert new format to old format
    const subjectMarksMap = {};
    
    marks.forEach(mark => {
      const subjectId = mark.subject._id.toString();
      
      if (!subjectMarksMap[subjectId]) {
        subjectMarksMap[subjectId] = {
          _id: mark._id,
          subject: mark.subject,
          student: mark.student,
          internal1: 0,
          internal2: 0,
          internal3: 0,
          assignment1: 0,
          assignment2: 0,
          altAssignment1: 0,
          altAssignment2: 0,
          createdAt: mark.createdAt,
          updatedAt: mark.updatedAt
        };
      }
      
      // Map new format exams to old internal fields
      if (mark.examType === 'INTERNAL') {
        if (mark.examName === 'Internal 1' || mark.examName === 'internal1') {
          subjectMarksMap[subjectId].internal1 = mark.marks || 0;
        } else if (mark.examName === 'Internal 2' || mark.examName === 'internal2') {
          subjectMarksMap[subjectId].internal2 = mark.marks || 0;
        } else if (mark.examName === 'Internal 3' || mark.examName === 'internal3') {
          subjectMarksMap[subjectId].internal3 = mark.marks || 0;
        }
      } else if (mark.examType === 'EXTERNAL') {
        subjectMarksMap[subjectId].external = (subjectMarksMap[subjectId].external || 0) + (mark.marks || 0);
        subjectMarksMap[subjectId].externalMax = (subjectMarksMap[subjectId].externalMax || 0) + (mark.maxMarks || 100);
      } else if (mark.examType === 'ASSIGNMENT') {
        if (mark.examName === 'Assignment 1') {
          subjectMarksMap[subjectId].assignment1 = mark.marks || 0;
        } else if (mark.examName === 'Assignment 2') {
          subjectMarksMap[subjectId].assignment2 = mark.marks || 0;
        } else if (mark.examName === 'Alternative Assignment 1') {
          subjectMarksMap[subjectId].altAssignment1 = mark.marks || 0;
        } else if (mark.examName === 'Alternative Assignment 2') {
          subjectMarksMap[subjectId].altAssignment2 = mark.marks || 0;
        }
      }
      
      // Also include legacy data if available
      if (mark.internal1 > 0) subjectMarksMap[subjectId].internal1 = mark.internal1;
      if (mark.internal2 > 0) subjectMarksMap[subjectId].internal2 = mark.internal2;
      if (mark.internal3 > 0) subjectMarksMap[subjectId].internal3 = mark.internal3;
      if (mark.external > 0) subjectMarksMap[subjectId].external = mark.external;
      if (mark.assignment1 > 0) subjectMarksMap[subjectId].assignment1 = mark.assignment1;
      if (mark.assignment2 > 0) subjectMarksMap[subjectId].assignment2 = mark.assignment2;
      if (mark.altAssignment1 > 0) subjectMarksMap[subjectId].altAssignment1 = mark.altAssignment1;
      if (mark.altAssignment2 > 0) subjectMarksMap[subjectId].altAssignment2 = mark.altAssignment2;
    });

    const enhancedMarks = Object.values(subjectMarksMap).map(mark => {
      const average = (mark.internal1 + mark.internal2 + mark.internal3) / 3;
      const status = average >= 20 ? 'SAFE' : 'AT_RISK';
      
      return {
        ...mark,
        average: Math.round(average * 100) / 100,
        status
      };
    });

    res.status(200).json({
      success: true,
      count: enhancedMarks.length,
      data: enhancedMarks
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enterMarks,
  addOrUpdateMarks,
  getMyMarks,
  getMarksBySubject,
  getMarksByStudent,
  calculateGPA
};