const Homework = require('../models/Homework');
const Submission = require('../models/Submission');
const mongoose = require('mongoose');
const { checkPlagiarism } = require('../utils/plagiarismDetector');
const AuditLogger = require('../utils/auditLogger');
const { uploadFor } = require('../utils/stagedUpload');
const {
  getStorage,
  persistStagedFiles,
  discardStagedFiles,
  lookupContentType,
  StorageError,
} = require('../utils/storage');

// Staged homework upload (10MB, PDF/DOC/DOCX/TXT/JPG/PNG/ZIP/RAR). The
// controller persists staged files through the storage adapter; validation
// is unchanged.
const upload = uploadFor('homework', { files: 5 });

/**
 * Create new homework assignment
 */
exports.createHomework = async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      department,
      dueDate,
      totalPoints,
      allowLateSubmission,
      latePenaltyPercentage,
      latePenaltyPerDay,
      maxLateDays,
      instructions,
      allowedFileTypes,
      maxFileSize,
      enablePlagiarismCheck,
      plagiarismThreshold
    } = req.body;

    const homework = new Homework({
      title,
      description,
      course,
      faculty: req.user._id,
      department,
      dueDate,
      totalPoints,
      allowLateSubmission,
      latePenaltyPercentage,
      latePenaltyPerDay,
      maxLateDays,
      instructions,
      allowedFileTypes,
      maxFileSize,
      enablePlagiarismCheck,
      plagiarismThreshold
    });

    // Persist staged attachments through the adapter BEFORE saving, so a
    // failed write never creates a success-looking record.
    let savedAttachments = [];
    if (req.files && req.files.length > 0) {
      const { storage, config } = getStorage();
      try {
        savedAttachments = await persistStagedFiles(
          storage,
          config,
          req.files.map((file) => ({
            category: 'homework',
            stagedPath: file.path,
            originalName: file.originalname,
            mimetype: file.mimetype,
          }))
        );
      } catch (err) {
        discardStagedFiles(req.files);
        return res.status(err.status || 500).json({
          success: false,
          message: err.message || 'Error uploading attachments',
        });
      }
      homework.attachments = savedAttachments.map((s) => ({
        filename: s.filename,
        originalName: s.originalName,
        path: `uploads/homework/${s.filename}`,
        mimetype: s.mimetype,
        size: s.size,
      }));
    }

    try {
      await homework.save();
    } catch (dbError) {
      if (savedAttachments.length > 0) {
        const { storage } = getStorage();
        for (const s of savedAttachments) {
          try {
            await storage.delete({ category: 'homework', filename: s.filename });
          } catch (_) {}
        }
      }
      throw dbError;
    }
    await homework.populate('course faculty department');

    res.status(201).json({
      success: true,
      message: 'Homework created successfully',
      data: homework
    });
  } catch (error) {
    console.error('Create homework error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating homework',
      error: error.message
    });
  }
};

/**
 * Get all homework assignments
 */
exports.getAllHomework = async (req, res) => {
  try {
    const { course, faculty, department, isActive, startDate, endDate } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (course) filter.course = course;
    if (faculty) filter.faculty = faculty;
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    if (startDate || endDate) {
      filter.dueDate = {};
      if (startDate) filter.dueDate.$gte = new Date(startDate);
      if (endDate) filter.dueDate.$lte = new Date(endDate);
    }

    const homework = await Homework.find(filter)
      .populate('course faculty department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Homework.countDocuments(filter);

    res.json({
      success: true,
      data: homework,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Get homework error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching homework',
      error: error.message
    });
  }
};

/**
 * Get homework by ID
 */
exports.getHomeworkById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid homework ID format'
      });
    }
    const homework = await Homework.findById(req.params.id)
      .populate('course faculty department');

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Homework not found'
      });
    }

    res.json({
      success: true,
      data: homework
    });
  } catch (error) {
    console.error('Get homework by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching homework',
      error: error.message
    });
  }
};

/**
 * Update homework
 */
exports.updateHomework = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid homework ID format'
      });
    }
    const homework = await Homework.findById(req.params.id);

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Homework not found'
      });
    }

    // Check if user is the faculty who created it
    if (homework.faculty.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this homework'
      });
    }

    const updates = { ...req.body };
    delete updates.faculty; // Prevent changing faculty

    Object.assign(homework, updates);
    homework.updatedAt = Date.now();

    await homework.save();
    await homework.populate('course faculty department');

    res.json({
      success: true,
      message: 'Homework updated successfully',
      data: homework
    });
  } catch (error) {
    console.error('Update homework error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating homework',
      error: error.message
    });
  }
};

/**
 * Delete homework
 */
exports.deleteHomework = async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id);

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Homework not found'
      });
    }

    if (homework.faculty.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this homework'
      });
    }

    // Delete associated files through the adapter (missing is fine).
    if (homework.attachments && homework.attachments.length > 0) {
      const { storage } = getStorage();
      for (const attachment of homework.attachments) {
        try {
          await storage.delete({
            category: 'homework',
            filename: attachment.filename,
            storedPath: attachment.path,
          });
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
    }

    await homework.deleteOne();

    res.json({
      success: true,
      message: 'Homework deleted successfully'
    });
  } catch (error) {
    console.error('Delete homework error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting homework',
      error: error.message
    });
  }
};

/**
 * Submit homework
 */
exports.submitHomework = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { textContent } = req.body;

    const homework = await Homework.findById(homeworkId);

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Homework not found'
      });
    }

    // Check if homework is active
    if (!homework.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This homework is no longer accepting submissions'
      });
    }

    // Check if late submission is allowed
    const now = new Date();
    const isLate = now > homework.dueDate;

    if (isLate && !homework.allowLateSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Late submissions are not allowed for this homework'
      });
    }

    // Check if student already submitted
    const existingSubmission = await Submission.findOne({
      homework: homeworkId,
      student: req.user._id
    }).sort({ version: -1 });

    let version = 1;
    if (existingSubmission) {
      if (!existingSubmission.resubmissionAllowed) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted this homework'
        });
      }
      version = existingSubmission.version + 1;
    }

    const submission = new Submission({
      homework: homeworkId,
      student: req.user._id,
      textContent: textContent || '',
      version,
      previousSubmission: existingSubmission ? existingSubmission._id : null
    });

    // Persist staged submission files through the adapter BEFORE saving.
    let savedFiles = [];
    if (req.files && req.files.length > 0) {
      const { storage, config } = getStorage();
      try {
        savedFiles = await persistStagedFiles(
          storage,
          config,
          req.files.map((file) => ({
            category: 'homework',
            stagedPath: file.path,
            originalName: file.originalname,
            mimetype: file.mimetype,
          }))
        );
      } catch (err) {
        discardStagedFiles(req.files);
        return res.status(err.status || 500).json({
          success: false,
          message: err.message || 'Error uploading submission files',
        });
      }
      submission.files = savedFiles.map((s) => ({
        filename: s.filename,
        originalName: s.originalName,
        path: `uploads/homework/${s.filename}`,
        mimetype: s.mimetype,
        size: s.size,
      }));
    }

    try {
      await submission.save();
    } catch (dbError) {
      if (savedFiles.length > 0) {
        const { storage } = getStorage();
        for (const s of savedFiles) {
          try {
            await storage.delete({ category: 'homework', filename: s.filename });
          } catch (_) {}
        }
      }
      throw dbError;
    }

    // Update homework submission count
    homework.submissionCount += 1;
    await homework.save();

    // Run plagiarism check if enabled
    if (homework.enablePlagiarismCheck && textContent) {
      const allSubmissions = await Submission.find({
        homework: homeworkId,
        _id: { $ne: submission._id }
      }).select('textContent student _id');

      const plagiarismResult = await checkPlagiarism(
        submission,
        allSubmissions,
        homework.plagiarismThreshold
      );

      submission.plagiarismScore = plagiarismResult.overallScore;
      submission.plagiarismDetails = plagiarismResult.matches;
      submission.isPlagiarismChecked = true;
      await submission.save();
    }

    await submission.populate('student homework');

    res.status(201).json({
      success: true,
      message: 'Homework submitted successfully',
      data: submission
    });
  } catch (error) {
    console.error('Submit homework error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting homework',
      error: error.message
    });
  }
};

/**
 * Get submissions for a homework
 */
exports.getSubmissions = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { status, student } = req.query;

    const filter = { homework: homeworkId };
    if (status) filter.status = status;
    if (student) filter.student = student;

    const submissions = await Submission.find(filter)
      .populate('student', 'name email')
      .populate('gradedBy', 'name email')
      .sort({ submittedAt: -1 });

    // Attach the Student-profile USN so faculty/admin see the real student
    // identity (the populated User has name/email only — no rollNumber).
    const Student = require('../models/Student');
    const userIds = [...new Set(submissions.map((s) => s.student?._id?.toString()).filter(Boolean))];
    const profiles = await Student.find({ userId: { $in: userIds } }).select('userId usn');
    const usnByUser = new Map(profiles.map((p) => [p.userId.toString(), p.usn]));
    const enriched = submissions.map((s) => {
      const obj = s.toObject();
      obj.studentUsn = usnByUser.get(s.student?._id?.toString()) || null;
      return obj;
    });

    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching submissions',
      error: error.message
    });
  }
};

/**
 * Grade a submission
 */
exports.gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback, resubmissionAllowed } = req.body;

    const submission = await Submission.findById(submissionId)
      .populate('homework');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Verify faculty authorization
    if (submission.homework.faculty.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to grade this submission'
      });
    }

    const beforeState = {
      grade: submission.grade,
      status: submission.status
    };
    
    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = 'graded';
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    submission.resubmissionAllowed = resubmissionAllowed || false;

    // Calculate adjusted grade considering late penalty
    submission.calculateAdjustedGrade();

    await submission.save();
    await submission.populate('student gradedBy');
    
    // Audit log for grading
    await AuditLogger.logHomeworkAction('SUBMISSION_GRADED', req.user, {
      entityId: submission._id,
      affectedUser: submission.student._id,
      subject: submission.homework.course,
      changes: {
        before: beforeState,
        after: { grade, status: 'graded', adjustedGrade: submission.adjustedGrade }
      },
      metadata: {
        homeworkTitle: submission.homework.title,
        feedback: feedback?.substring(0, 100),
        resubmissionAllowed
      },
      req
    });

    res.json({
      success: true,
      message: 'Submission graded successfully',
      data: submission
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error grading submission',
      error: error.message
    });
  }
};

/**
 * Get student's submissions
 */
exports.getMySubmissions = async (req, res) => {
  try {
    const { course, status } = req.query;
    const filter = { student: req.user._id };

    if (status) filter.status = status;

    let query = Submission.find(filter)
      .populate('homework')
      .populate('gradedBy', 'name email')
      .sort({ submittedAt: -1 });

    let submissions = await query;

    // Filter by course if specified
    if (course) {
      submissions = submissions.filter(
        sub => sub.homework.course.toString() === course
      );
    }

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching submissions',
      error: error.message
    });
  }
};

/**
 * Run plagiarism check manually
 */
exports.runPlagiarismCheck = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId)
      .populate('homework');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    if (!submission.textContent) {
      return res.status(400).json({
        success: false,
        message: 'No text content to check for plagiarism'
      });
    }

    const allSubmissions = await Submission.find({
      homework: submission.homework._id,
      _id: { $ne: submission._id }
    }).select('textContent student _id');

    const plagiarismResult = await checkPlagiarism(
      submission,
      allSubmissions,
      submission.homework.plagiarismThreshold || 30
    );

    submission.plagiarismScore = plagiarismResult.overallScore;
    submission.plagiarismDetails = plagiarismResult.matches;
    submission.isPlagiarismChecked = true;
    await submission.save();

    res.json({
      success: true,
      message: 'Plagiarism check completed',
      data: {
        plagiarismScore: plagiarismResult.overallScore,
        isPlagiarized: plagiarismResult.isPlagiarized,
        matches: plagiarismResult.matches
      }
    });
  } catch (error) {
    console.error('Plagiarism check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error running plagiarism check',
      error: error.message
    });
  }
};

/**
 * Download submission file
 */
exports.downloadSubmissionFile = async (req, res) => {
  try {
    const { submissionId, fileIndex } = req.params;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission ID format'
      });
    }

    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Only the owning student, the homework's faculty owner, or ADMIN.
    if (req.user.role !== 'ADMIN') {
      const homework = await Homework.findById(submission.homework).select('faculty');
      const isOwnerStudent = submission.student.toString() === req.user._id.toString();
      const isOwnerFaculty = !!homework && !!homework.faculty && homework.faculty.toString() === req.user._id.toString();
      if (!isOwnerStudent && !isOwnerFaculty) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to download this file'
        });
      }
    }

    const file = submission.files[parseInt(fileIndex)];

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Stream the private object through the API only after the ownership
    // gate above has passed. Legacy absolute paths still resolve.
    const { storage } = getStorage();
    let stored;
    try {
      stored = await storage.get({
        category: 'homework',
        filename: file.filename,
        storedPath: file.path,
      });
    } catch (err) {
      if (err instanceof StorageError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'File not found' });
      }
      throw err;
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${String(file.originalName).replace(/["\r\n]/g, '')}"`
    );
    res.setHeader('Content-Type', file.mimetype || stored.contentType || lookupContentType(file.filename));
    if (typeof stored.bytes === 'number') res.setHeader('Content-Length', String(stored.bytes));
    stored.stream.on('error', (streamErr) => {
      console.error('Download file error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error downloading file' });
      } else {
        res.end();
      }
    });
    return stored.stream.pipe(res);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message
    });
  }
};

// Export multer upload middleware
exports.uploadMiddleware = upload;
