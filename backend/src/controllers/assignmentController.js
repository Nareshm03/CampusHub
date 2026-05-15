const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const path = require('path');
const fs = require('fs').promises;

/**
 * Create new assignment
 * @route POST /api/v1/assignments
 * @access Faculty, Admin
 */
exports.createAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      department,
      semester,
      dueDate,
      totalMarks,
      instructions,
      allowLateSubmission,
      latePenaltyPercentage,
      submissionType,
      allowedFileTypes,
      targetStudents,
      visibility,
      rubric
    } = req.body;

    // Verify faculty teaches this subject
    if (req.user.role === 'FACULTY') {
      const faculty = await Faculty.findOne({ userId: req.user._id });
      if (!faculty) {
        return res.status(404).json({
          success: false,
          error: 'Faculty profile not found'
        });
      }

      const teachesSubject = faculty.subjects.some(s => s.toString() === subject);
      if (!teachesSubject) {
        return res.status(403).json({
          success: false,
          error: 'You can only create assignments for subjects you teach'
        });
      }
    }

    const assignment = await Assignment.create({
      title,
      description,
      subject,
      faculty: req.user.role === 'FACULTY' ? (await Faculty.findOne({ userId: req.user._id }))._id : req.body.faculty,
      department,
      semester,
      dueDate,
      totalMarks,
      instructions,
      allowLateSubmission: allowLateSubmission || false,
      latePenaltyPercentage: latePenaltyPercentage || 10,
      submissionType: submissionType || 'FILE',
      allowedFileTypes: allowedFileTypes || ['.pdf', '.doc', '.docx', '.zip'],
      targetStudents,
      visibility: visibility || 'ALL',
      rubric,
      institution: req.user.institution
    });

    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate('subject', 'name subjectCode')
      .populate('faculty', 'name email')
      .populate('department', 'name');

    res.status(201).json({
      success: true,
      data: populatedAssignment
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating assignment',
      message: error.message
    });
  }
};

/**
 * Get all assignments with filters
 * @route GET /api/v1/assignments
 * @access Authenticated
 */
exports.getAssignments = async (req, res) => {
  try {
    const { subject, semester, department, status, faculty } = req.query;
    const query = {};

    // Apply filters
    if (subject) query.subject = subject;
    if (semester) query.semester = semester;
    if (department) query.department = department;
    if (status) query.status = status;
    if (faculty) query.faculty = faculty;

    // Role-based filtering
    if (req.user.role === 'STUDENT') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        query.department = student.department;
        query.semester = student.semester;
        query.status = { $in: ['PUBLISHED', 'CLOSED'] };
      }
    } else if (req.user.role === 'FACULTY') {
      const faculty = await Faculty.findOne({ userId: req.user._id });
      if (faculty) {
        query.faculty = faculty._id;
      }
    }

    // Institution filter
    if (req.user.institution) {
      query.institution = req.user.institution;
    }

    const assignments = await Assignment.find(query)
      .populate('subject', 'name subjectCode')
      .populate('faculty', 'name email')
      .populate('department', 'name')
      .sort({ dueDate: 1, createdAt: -1 });

    // Get submission status for students
    if (req.user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: req.user._id });
      if (student) {
        const assignmentIds = assignments.map(a => a._id);
        const submissions = await AssignmentSubmission.find({
          assignment: { $in: assignmentIds },
          student: student._id
        });

        const submissionMap = {};
        submissions.forEach(sub => {
          submissionMap[sub.assignment.toString()] = sub;
        });

        assignments.forEach(assignment => {
          assignment._doc.submission = submissionMap[assignment._id.toString()] || null;
        });
      }
    }

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching assignments'
    });
  }
};

/**
 * Get assignment by ID
 * @route GET /api/v1/assignments/:id
 * @access Authenticated
 */
exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('subject', 'name subjectCode credits')
      .populate('faculty', 'name email')
      .populate('department', 'name')
      .populate('targetStudents', 'name usn');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    // Check access
    if (req.user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: req.user._id });
      if (student && assignment.visibility === 'SPECIFIC_STUDENTS') {
        const hasAccess = assignment.targetStudents.some(s => s._id.toString() === student._id.toString());
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'You do not have access to this assignment'
          });
        }
      }

      // Get student's submission
      if (student) {
        const submission = await AssignmentSubmission.findOne({
          assignment: assignment._id,
          student: student._id
        });
        assignment._doc.submission = submission;
      }
    }

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching assignment'
    });
  }
};

/**
 * Update assignment
 * @route PUT /api/v1/assignments/:id
 * @access Faculty (own), Admin
 */
exports.updateAssignment = async (req, res) => {
  try {
    let assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    // Check ownership for faculty
    if (req.user.role === 'FACULTY') {
      const faculty = await Faculty.findOne({ userId: req.user._id });
      if (assignment.faculty.toString() !== faculty._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'You can only update your own assignments'
        });
      }
    }

    assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('subject faculty department');

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating assignment'
    });
  }
};

/**
 * Delete assignment
 * @route DELETE /api/v1/assignments/:id
 * @access Faculty (own), Admin
 */
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    // Check ownership for faculty
    if (req.user.role === 'FACULTY') {
      const faculty = await Faculty.findOne({ userId: req.user._id });
      if (assignment.faculty.toString() !== faculty._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own assignments'
        });
      }
    }

    await assignment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting assignment'
    });
  }
};

/**
 * Upload assignment files
 * @route POST /api/v1/assignments/:id/upload
 * @access Faculty
 */
exports.uploadAssignmentFiles = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const attachments = req.files.map(file => ({
      filename: file.originalname,
      filepath: file.path,
      mimetype: file.mimetype,
      size: file.size
    }));

    assignment.attachments.push(...attachments);
    await assignment.save();

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      success: false,
      error: 'Error uploading files'
    });
  }
};

/**
 * Submit assignment
 * @route POST /api/v1/assignments/:id/submit
 * @access Student
 */
exports.submitAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    // Check if assignment is still open
    const now = new Date();
    const isLate = now > assignment.dueDate;

    if (isLate && !assignment.allowLateSubmission && assignment.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        error: 'Assignment submission deadline has passed'
      });
    }

    // Check for existing submission
    let submission = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: student._id
    });

    if (submission) {
      // Save previous submission
      submission.previousSubmissions.push({
        files: submission.files,
        textSubmission: submission.textSubmission,
        submittedAt: submission.submittedAt
      });
      submission.version += 1;
    }

    const files = req.files ? req.files.map(file => ({
      filename: file.originalname,
      filepath: file.path,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    if (submission) {
      submission.files = files;
      submission.textSubmission = req.body.textSubmission;
      submission.submittedAt = new Date();
      submission.isLate = isLate;
      submission.status = isLate ? 'LATE' : 'SUBMITTED';
      await submission.save();
    } else {
      submission = await AssignmentSubmission.create({
        assignment: assignment._id,
        student: student._id,
        files,
        textSubmission: req.body.textSubmission,
        isLate,
        status: isLate ? 'LATE' : 'SUBMITTED',
        institution: req.user.institution
      });
    }

    const populatedSubmission = await AssignmentSubmission.findById(submission._id)
      .populate('assignment', 'title dueDate totalMarks')
      .populate('student', 'name usn');

    res.status(201).json({
      success: true,
      data: populatedSubmission
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Error submitting assignment',
      message: error.message
    });
  }
};

/**
 * Get assignment submissions
 * @route GET /api/v1/assignments/:id/submissions
 * @access Faculty, Admin
 */
exports.getAssignmentSubmissions = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    // Check access for faculty
    if (req.user.role === 'FACULTY') {
      const faculty = await Faculty.findOne({ userId: req.user._id });
      if (assignment.faculty.toString() !== faculty._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'You can only view submissions for your own assignments'
        });
      }
    }

    const submissions = await AssignmentSubmission.find({ assignment: req.params.id })
      .populate('student', 'name usn email')
      .populate('gradedBy', 'name')
      .sort({ submittedAt: -1 });

    // Get statistics
    const stats = {
      total: submissions.length,
      graded: submissions.filter(s => s.status === 'GRADED').length,
      pending: submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'LATE').length,
      late: submissions.filter(s => s.isLate).length,
      averageScore: 0
    };

    const gradedSubmissions = submissions.filter(s => s.marksObtained !== undefined);
    if (gradedSubmissions.length > 0) {
      const totalScore = gradedSubmissions.reduce((sum, s) => sum + s.marksObtained, 0);
      stats.averageScore = (totalScore / gradedSubmissions.length).toFixed(2);
    }

    res.status(200).json({
      success: true,
      count: submissions.length,
      stats,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching submissions'
    });
  }
};

/**
 * Grade assignment submission
 * @route PUT /api/v1/assignments/submissions/:id/grade
 * @access Faculty, Admin
 */
exports.gradeSubmission = async (req, res) => {
  try {
    const { marksObtained, feedback, rubricScores } = req.body;

    let submission = await AssignmentSubmission.findById(req.params.id)
      .populate('assignment');

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    // Check access for faculty
    if (req.user.role === 'FACULTY') {
      const faculty = await Faculty.findOne({ userId: req.user._id });
      if (submission.assignment.faculty.toString() !== faculty._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'You can only grade submissions for your own assignments'
        });
      }
    }

    // Apply late penalty if applicable
    let finalMarks = marksObtained;
    if (submission.isLate && submission.assignment.allowLateSubmission) {
      const penalty = (marksObtained * submission.assignment.latePenaltyPercentage) / 100;
      finalMarks = Math.max(0, marksObtained - penalty);
    }

    submission.marksObtained = finalMarks;
    submission.feedback = feedback;
    submission.rubricScores = rubricScores;
    submission.status = 'GRADED';
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();

    await submission.save();

    submission = await AssignmentSubmission.findById(submission._id)
      .populate('assignment', 'title totalMarks')
      .populate('student', 'name usn')
      .populate('gradedBy', 'name');

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({
      success: false,
      error: 'Error grading submission'
    });
  }
};

/**
 * Get student's submissions
 * @route GET /api/v1/assignments/my-submissions
 * @access Student
 */
exports.getMySubmissions = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    const submissions = await AssignmentSubmission.find({ student: student._id })
      .populate({
        path: 'assignment',
        populate: {
          path: 'subject',
          select: 'name subjectCode'
        }
      })
      .populate('gradedBy', 'name')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching submissions'
    });
  }
};

/**
 * Get upcoming assignment & homework deadlines for the logged-in student
 * @route GET /api/v1/assignments/upcoming-deadlines
 * @access Student
 */
exports.getUpcomingDeadlines = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const Homework = require('../models/Homework');
    const AssignmentSubmission = require('../models/AssignmentSubmission');

    const [assignments, homeworks] = await Promise.all([
      Assignment.find({
        department: student.department,
        semester: student.semester,
        status: { $in: ['PUBLISHED', 'CLOSED'] },
        dueDate: { $gte: now, $lte: in7Days },
        ...(req.user.institution ? { institution: req.user.institution } : {})
      }).populate('subject', 'name subjectCode').sort({ dueDate: 1 }).limit(10),

      Homework.find({
        department: student.department,
        isActive: true,
        dueDate: { $gte: now, $lte: in7Days }
      }).populate('course', 'name code').sort({ dueDate: 1 }).limit(10)
    ]);

    // Attach submission status to assignments
    const assignmentIds = assignments.map(a => a._id);
    const submissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds },
      student: student._id
    }).select('assignment status');
    const submissionMap = {};
    submissions.forEach(s => { submissionMap[s.assignment.toString()] = s.status; });

    const deadlines = [
      ...assignments.map(a => ({
        _id: a._id,
        title: a.title,
        type: 'assignment',
        subject: a.subject?.name || '',
        subjectCode: a.subject?.subjectCode || '',
        dueDate: a.dueDate,
        totalMarks: a.totalMarks,
        submissionStatus: submissionMap[a._id.toString()] || null,
        href: `/homework/${a._id}`
      })),
      ...homeworks.map(h => ({
        _id: h._id,
        title: h.title,
        type: 'homework',
        subject: h.course?.name || '',
        subjectCode: h.course?.code || '',
        dueDate: h.dueDate,
        totalMarks: h.totalPoints,
        submissionStatus: null,
        href: `/homework/${h._id}`
      }))
    ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.status(200).json({ success: true, count: deadlines.length, data: deadlines });
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    res.status(500).json({ success: false, error: 'Error fetching upcoming deadlines' });
  }
};

module.exports = exports;
