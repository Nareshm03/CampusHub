const Department = require('../models/Department');

// @desc    Create new department
// @route   POST /api/departments
// @access  Admin
const createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('hod', 'name email employeeId')
      .populate({
        path: 'hod',
        populate: { path: 'userId', select: 'name email' }
      });
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Admin
const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!department) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Admin
const deleteDepartment = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid department ID format' });
    }

    // Referential guard: never orphan dependent records. No cascade —
    // rejection forces explicit reassignment first.
    const Student = require('../models/Student');
    const Faculty = require('../models/Faculty');
    const Subject = require('../models/Subject');
    const User = require('../models/User');
    const Course = require('../models/Course');
    const Assignment = require('../models/Assignment');
    const Exam = require('../models/Exam');
    const Homework = require('../models/Homework');
    const DigitalBook = require('../models/DigitalBook');
    const id = req.params.id;
    const refs = await Promise.all([
      Student.countDocuments({ department: id }),
      Faculty.countDocuments({ department: id }),
      Subject.countDocuments({ department: id }),
      User.countDocuments({ department: id }),
      Course.countDocuments({ department: id }),
      Assignment.countDocuments({ department: id }),
      Exam.countDocuments({ department: id }),
      Homework.countDocuments({ department: id }),
      DigitalBook.countDocuments({
        $or: [{ department: id }, { allowedDepartments: id }]
      })
    ]);
    const labels = ['students', 'faculty', 'subjects', 'users', 'courses', 'assignments', 'exams', 'homework', 'digital books'];
    const blocking = labels.filter((label, i) => refs[i] > 0);
    if (blocking.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete department: still referenced by ${blocking.join(', ')}. Reassign those records first.`
      });
    }

    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createDepartment,
  getAllDepartments,
  updateDepartment,
  deleteDepartment
};