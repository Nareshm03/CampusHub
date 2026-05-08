const Timetable = require('../models/Timetable');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const { logger } = require('../utils/logger');

// @desc    Create timetable entry
// @route   POST /api/timetable
// @access  Private/Admin
exports.createTimetable = async (req, res) => {
  try {
    const { day, period, subject, faculty, department, semester } = req.body;

    // Validate required fields explicitly — do not blindly pass req.body to model
    if (!day || !period || !subject || !faculty || !department || !semester) {
      return res.status(400).json({
        success: false,
        error: 'day, period, subject, faculty, department and semester are all required'
      });
    }

    const timetableEntry = new Timetable({ day, period, subject, faculty, department, semester });
    await timetableEntry.save();

    const populated = await Timetable.findById(timetableEntry._id)
      .populate('subject', 'name subjectCode')
      .populate('faculty', 'name')
      .populate('department', 'name');

    logger.info('Timetable entry created', {
      entryId: timetableEntry._id,
      day,
      period,
      department,
      semester,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    // Duplicate key = conflicting slot
    if (error.code === 11000) {
      logger.warn('Timetable slot conflict', { body: req.body, error: error.message });
      return res.status(409).json({
        success: false,
        error: 'A timetable entry already exists for this day, period, department and semester'
      });
    }
    logger.error('createTimetable error', { error: error.message, stack: error.stack });
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Faculty creates a timetable entry (own dept only)
// @route   POST /api/timetable/faculty
// @access  Private/Faculty
exports.createTimetableByFaculty = async (req, res) => {
  try {
    const { day, period, subject, semester, facultyId, department: deptOverride } = req.body;
    if (!day || !period || !subject || !semester) {
      return res.status(400).json({ success: false, error: 'day, period, subject and semester are required' });
    }

    let department;
    if (req.user.role === 'ADMIN') {
      if (!deptOverride) return res.status(400).json({ success: false, error: 'department is required for admin' });
      department = deptOverride;
    } else {
      const facultyProfile = await Faculty.findOne({ userId: req.user._id }).select('department');
      if (!facultyProfile) return res.status(404).json({ success: false, error: 'Faculty profile not found' });
      department = facultyProfile.department;

      const subjectDoc = await Subject.findById(subject).select('department');
      if (!subjectDoc) return res.status(404).json({ success: false, error: 'Subject not found' });
      if (subjectDoc.department.toString() !== department.toString()) {
        return res.status(403).json({ success: false, error: 'Subject does not belong to your department' });
      }
    }

    const entry = new Timetable({
      day, period, subject,
      faculty: facultyId || req.user._id,
      department,
      semester
    });
    await entry.save();

    const populated = await Timetable.findById(entry._id)
      .populate('subject', 'name subjectCode')
      .populate('faculty', 'name')
      .populate('department', 'name');

    logger.info('Faculty created timetable entry', {
      entryId: entry._id,
      userId: req.user._id,
      assignedTo: facultyId || req.user._id
    });
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'A timetable entry already exists for this slot' });
    }
    logger.error('createTimetableByFaculty error', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Faculty deletes their own timetable entry
// @route   DELETE /api/timetable/faculty/:id
// @access  Private/Faculty
exports.deleteTimetableByFaculty = async (req, res) => {
  try {
    const entry = await Timetable.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });
    if (req.user.role !== 'ADMIN' && entry.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this entry' });
    }
    await entry.deleteOne();
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get timetable for the authenticated student
// @route   GET /api/timetable/student
// @access  Private/Student
exports.getStudentTimetable = async (req, res) => {
  try {
    // BUG FIX 1: Student schema uses `userId`, not `user`
    // BUG FIX 2: Do not call .populate('department') then access ._id —
    //            query by the stored ObjectId directly to avoid null-pointer
    //            when populate fails or department ref is missing.
    const student = await Student.findOne({ userId: req.user._id }).select('department semester');

    if (!student) {
      logger.warn('getStudentTimetable: student profile not found', { userId: req.user._id });
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    // Guard: department field must be a valid ObjectId before querying
    if (!student.department) {
      logger.warn('getStudentTimetable: student has no department assigned', { userId: req.user._id });
      return res.status(422).json({ success: false, error: 'Student department is not assigned' });
    }

    const timetable = await Timetable.find({
      department: student.department, // already an ObjectId — no ._id needed
      semester: student.semester
    })
      .populate('subject', 'name subjectCode')
      .populate('faculty', 'name')
      .sort({ day: 1, period: 1 });

    res.json({ success: true, data: timetable });
  } catch (error) {
    logger.error('getStudentTimetable error', {
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, error: 'Failed to fetch student timetable' });
  }
};

// @desc    Get timetable for a specific department and semester (for faculty management)
// @route   GET /api/timetable/class
// @access  Private/Faculty
exports.getTimetableByClass = async (req, res) => {
  try {
    const { departmentId, semester } = req.query;
    if (!departmentId || !semester) {
      return res.status(400).json({ success: false, error: 'departmentId and semester are required' });
    }

    if (req.user.role !== 'ADMIN') {
      const facultyProfile = await Faculty.findOne({ userId: req.user._id }).select('department');
      if (!facultyProfile) return res.status(404).json({ success: false, error: 'Faculty profile not found' });
      if (facultyProfile.department.toString() !== departmentId) {
        return res.status(403).json({ success: false, error: 'Not authorized to view another department timetable' });
      }
    }

    const timetable = await Timetable.find({ department: departmentId, semester })
      .populate('subject', 'name subjectCode')
      .populate('faculty', 'name')
      .sort({ day: 1, period: 1 });

    res.json({ success: true, data: timetable });
  } catch (error) {
    logger.error('getTimetableByClass error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch class timetable' });
  }
};

// @desc    Get timetable for the authenticated faculty member
// @route   GET /api/timetable/faculty
// @access  Private/Faculty
exports.getFacultyTimetable = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'ADMIN') {
      // Admin can pass ?facultyId= to filter, otherwise returns all
      if (req.query.facultyId) query.faculty = req.query.facultyId;
    } else {
      const facultyProfile = await Faculty.findOne({ userId: req.user._id }).select('_id');
      if (!facultyProfile) {
        return res.status(404).json({ success: false, error: 'Faculty profile not found' });
      }
      query.faculty = req.user._id;
    }

    const timetable = await Timetable.find(query)
      .populate('subject', 'name subjectCode')
      .populate('department', 'name')
      .populate('faculty', 'name')
      .sort({ day: 1, period: 1 });

    res.json({ success: true, data: timetable });
  } catch (error) {
    logger.error('getFacultyTimetable error', { userId: req.user?._id, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch faculty timetable' });
  }
};

