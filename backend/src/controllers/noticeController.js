const Notice = require('../models/Notice');
const Student = require('../models/Student');

// @desc    Create a new notice
// @route   POST /api/notices
// @access  Private/Admin/Faculty
const createNotice = async (req, res, next) => {
  try {
    const { title, message, targetType, targetAudience = 'ALL', department, semester } = req.body;

    // Validate targetType requirements
    if (targetType === 'DEPARTMENT' && !department) {
      return res.status(400).json({
        success: false,
        error: 'Department is required for DEPARTMENT notices'
      });
    }

    if (targetType === 'SEMESTER' && !semester) {
      return res.status(400).json({
        success: false,
        error: 'Semester is required for SEMESTER notices'
      });
    }

    const notice = await Notice.create({
      title,
      message,
      targetType,
      targetAudience,
      department,
      semester,
      createdBy: req.user.id
    });

    const populatedNotice = await Notice.findById(notice._id)
      .populate('createdBy', 'name')
      .populate('department', 'name code');

    res.status(201).json({
      success: true,
      data: populatedNotice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notices for student
// @route   GET /api/notices/student
// @access  Private/Student
const getNoticesForStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    const notices = await Notice.find({
      $and: [
        {
          $or: [
            { targetType: 'COLLEGE' },
            { targetType: 'DEPARTMENT', department: student.department },
            { targetType: 'SEMESTER', semester: student.semester }
          ]
        },
        { targetAudience: { $in: ['ALL', 'STUDENTS'] } }
      ]
    })
      .populate('createdBy', 'name')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all notices
// @route   GET /api/notices
// @access  Private/Admin
const getAllNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find()
      .populate('createdBy', 'name')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a notice
// @route   DELETE /api/notices/:id
// @access  Private/Admin
const deleteNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        error: 'Notice not found'
      });
    }

    await notice.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notices for faculty
// @route   GET /api/notices/faculty
// @access  Private/Faculty
const getNoticesForFaculty = async (req, res, next) => {
  try {
    const Faculty = require('../models/Faculty');
    const faculty = await Faculty.findOne({ userId: req.user.id });

    const query = { targetAudience: { $in: ['ALL', 'FACULTY'] } };
    if (faculty) {
      query.$or = [
        { targetType: 'COLLEGE' },
        { targetType: 'DEPARTMENT', department: faculty.department }
      ];
    } else {
      query.targetType = 'COLLEGE';
    }

    const notices = await Notice.find(query)
      .populate('createdBy', 'name')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: notices.length, data: notices });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotice,
  getNoticesForStudent,
  getNoticesForFaculty,
  getAllNotices,
  deleteNotice
};