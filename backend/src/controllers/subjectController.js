const Subject = require('../models/Subject');
const Department = require('../models/Department');
const mongoose = require('mongoose');

const createSubject = async (req, res) => {
  try {
    const { department, subjectCode } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(department)) {
      return res.status(400).json({ success: false, error: 'Invalid department ID format' });
    }
    
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(400).json({ success: false, error: 'Department not found' });
    }

    const duplicate = await Subject.findOne({ subjectCode: subjectCode?.trim().toUpperCase() });
    if (duplicate) {
      return res.status(409).json({ success: false, error: `Subject code '${subjectCode}' already exists` });
    }

    const subject = await Subject.create(req.body);
    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: `Subject code '${req.body.subjectCode}' already exists` });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

const getAllSubjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.department) {
      if (!mongoose.Types.ObjectId.isValid(req.query.department)) {
        return res.status(400).json({ success: false, error: 'Invalid department ID format' });
      }
      filter.department = req.query.department;
    }
    if (req.query.semester) filter.semester = req.query.semester;
    
    const subjects = await Subject.find(filter)
      .populate('department', 'name code')
      .populate('faculty', 'name email')
      .skip(skip)
      .limit(limit);
    
    // Enrich each subject with enrolled student count
    const Student = require('../models/Student');
    const enrichedSubjects = await Promise.all(
      subjects.map(async (subject) => {
        const enrolledCount = await Student.countDocuments({ subjects: subject._id });
        return {
          ...subject.toObject(),
          enrolledCount
        };
      })
    );
    
    const total = await Subject.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: enrichedSubjects,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSubjectsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ success: false, error: 'Invalid department ID format' });
    }
    
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    
    const subjects = await Subject.find({ department: departmentId })
      .populate('department', 'name code')
      .populate('faculty', 'name email');
    
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const assignFacultyToSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { facultyId } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ success: false, error: 'Invalid subject ID format' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      return res.status(400).json({ success: false, error: 'Invalid faculty ID format' });
    }
    
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    
    if (subject.faculty && subject.faculty.toString() === facultyId) {
      return res.status(400).json({ success: false, error: 'Faculty already assigned to this subject' });
    }
    
    const updatedSubject = await Subject.findByIdAndUpdate(
      subjectId,
      { faculty: facultyId },
      { new: true, runValidators: true }
    ).populate('faculty', 'name email');
    
    res.status(200).json({ success: true, data: updatedSubject, message: 'Faculty assigned successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const updateSubject = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid subject ID format' });
    }
    
    const updateData = { ...req.body };
    if (updateData.faculty === '' || updateData.faculty === null) delete updateData.faculty;
    if (updateData.department === '' || updateData.department === null) delete updateData.department;
    
    const subject = await Subject.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid subject ID format' });
    }
    
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSubjectsByFaculty = async (req, res) => {
  try {
    let filter = {};
    
    console.log('getSubjectsByFaculty called by user:', req.user.email, 'role:', req.user.role, 'id:', req.user._id);

    if (req.user.role !== 'ADMIN') {
      // Faculty can only see their assigned subjects
      filter.faculty = req.user._id;
    }
    
    const subjects = await Subject.find(filter)
      .populate('department', 'name code')
      .select('name subjectCode semester credits department');
      
    console.log('getSubjectsByFaculty found', subjects.length, 'subjects before enrichment');
    
    // Enrich each subject with enrolled student count
    const Student = require('../models/Student');
    const enriched = await Promise.all(
      subjects.map(async (subject) => {
        const studentCount = await Student.countDocuments({ subjects: subject._id });
        return {
          ...subject.toObject(),
          code: subject.subjectCode, // alias for frontend compatibility
          studentCount
        };
      })
    );
    
    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getStudentsBySubject = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid subject ID format' });
    }
    
    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    
    // Find students who have this subject in their subjects array
    const Student = require('../models/Student');
    const students = await Student.find({ subjects: id })
      .populate('userId', 'name email')
      .populate('department', 'name code')
      .select('usn semester subjects');
    
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Bulk add subjects
 * @route POST /api/v1/subjects/bulk
 * @access Admin
 */
const bulkAddSubjects = async (req, res) => {
  try {
    const { subjects } = req.body;

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Subjects array is required'
      });
    }

    // Validate all departments exist
    const departmentIds = [...new Set(subjects.map(s => s.department))];
    const departments = await Department.find({ _id: { $in: departmentIds } });

    if (departments.length !== departmentIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more departments not found'
      });
    }

    // Check for duplicate subject codes
    const subjectCodes = subjects.map(s => s.subjectCode);
    const existingSubjects = await Subject.find({
      subjectCode: { $in: subjectCodes }
    });

    if (existingSubjects.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Some subject codes already exist',
        duplicates: existingSubjects.map(s => s.subjectCode)
      });
    }

    const createdSubjects = await Subject.insertMany(subjects);

    res.status(201).json({
      success: true,
      count: createdSubjects.length,
      data: createdSubjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Remove faculty from subject
 * @route PUT /api/v1/subjects/:id/remove-faculty
 * @access Admin
 */
const removeFacultyFromSubject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subject ID format'
      });
    }

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    subject.faculty = undefined;
    await subject.save();

    res.status(200).json({
      success: true,
      data: subject,
      message: 'Faculty removed from subject'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get subject statistics
 * @route GET /api/v1/subjects/:id/stats
 * @access Faculty, Admin
 */
const getSubjectStats = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subject ID format'
      });
    }

    const subject = await Subject.findById(id)
      .populate('department', 'name')
      .populate('faculty', 'name email');

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    // Get enrolled students count
    const Student = require('../models/Student');
    const enrolledCount = await Student.countDocuments({ subjects: id });

    // Get assignment count
    const Assignment = require('../models/Assignment');
    const assignmentCount = await Assignment.countDocuments({ subject: id });

    // Get attendance records
    const Attendance = require('../models/Attendance');
    const attendanceCount = await Attendance.countDocuments({ subject: id });

    // Get marks records
    const Marks = require('../models/Marks');
    const marksCount = await Marks.countDocuments({ subject: id });

    const stats = {
      subject,
      enrolledStudents: enrolledCount,
      totalAssignments: assignmentCount,
      attendanceRecords: attendanceCount,
      marksRecords: marksCount
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Search subjects
 * @route GET /api/v1/subjects/search
 * @access Authenticated
 */
const searchSubjects = async (req, res) => {
  try {
    const { query, department, semester } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { subjectCode: { $regex: query, $options: 'i' } }
      ]
    };

    if (department) {
      searchQuery.department = department;
    }

    if (semester) {
      searchQuery.semester = parseInt(semester);
    }

    const subjects = await Subject.find(searchQuery)
      .populate('department', 'name')
      .populate('faculty', 'name email')
      .limit(20);

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectsByDepartment,
  assignFacultyToSubject,
  updateSubject,
  deleteSubject,
  getSubjectsByFaculty,
  getStudentsBySubject,
  bulkAddSubjects,
  removeFacultyFromSubject,
  getSubjectStats,
  searchSubjects
};