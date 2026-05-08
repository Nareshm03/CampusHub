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