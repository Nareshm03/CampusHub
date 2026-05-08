const Faculty = require('../models/Faculty');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Add new faculty with user account (Admin only)
// @route   POST /api/faculty
// @access  Private/Admin
const addFaculty = async (req, res, next) => {
  try {
    const { 
      name,
      email,
      password,
      employeeId, 
      department, 
      designation, 
      qualification, 
      experience, 
      subjects, 
      phone, 
      address, 
      dateOfJoining 
    } = req.body;

    // Create user account first
    const user = await User.create({
      name,
      email,
      password,
      role: 'FACULTY',
      department
    });

    // Create faculty profile
    const faculty = await Faculty.create({
      userId: user._id,
      employeeId,
      department,
      designation,
      qualification,
      experience,
      subjects,
      phone,
      address,
      dateOfJoining
    });

    const populatedFaculty = await Faculty.findById(faculty._id)
      .populate('userId', 'name email')
      .populate('department', 'name code')
      .populate('subjects', 'name subjectCode');

    res.status(201).json({
      success: true,
      data: populatedFaculty
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get faculty's own profile (Faculty only)
// @route   GET /api/faculty/profile
// @access  Private/Faculty
const getMyProfile = async (req, res, next) => {
  try {
    const faculty = await Faculty.findOne({ userId: req.user.id })
      .populate('userId', 'name email phone address dateOfBirth')
      .populate('department', 'name code')
      .populate('subjects', 'name subjectCode semester');

    if (!faculty) {
      return res.status(404).json({
        success: false,
        error: 'Faculty profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: faculty
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update faculty profile (Admin only)
// @route   PUT /api/faculty/:id
// @access  Private/Admin
const updateFaculty = async (req, res, next) => {
  try {
    console.log('Updating faculty with ID:', req.params.id);
    console.log('Update data:', req.body);
    
    // First try to find the faculty by ID
    let faculty = await Faculty.findById(req.params.id);
    
    // If not found, the ID might be a User ID, so try to find by userId
    if (!faculty) {
      console.log('Faculty not found by _id, trying userId:', req.params.id);
      faculty = await Faculty.findOne({ userId: req.params.id });
      
      if (!faculty) {
        console.log('Faculty not found with ID or userId:', req.params.id);
        return res.status(404).json({
          success: false,
          error: 'Faculty not found'
        });
      }
      console.log('Found faculty by userId, faculty._id:', faculty._id);
    }

    // Extract user-related fields (name, email, password) from request body
    const { name, email, password, ...facultyFields } = req.body;
    
    // Update User model if name, email, or password is provided
    if (name || email || password) {
      const userUpdateData = {};
      if (name) userUpdateData.name = name;
      if (email) userUpdateData.email = email;
      if (password) {
        // Hash password before updating
        const salt = await bcrypt.genSalt(10);
        userUpdateData.password = await bcrypt.hash(password, salt);
      }
      
      await User.findByIdAndUpdate(
        faculty.userId,
        userUpdateData,
        { new: true, runValidators: true }
      );
    }

    // Update Faculty model with remaining fields
    const updatedFaculty = await Faculty.findByIdAndUpdate(
      faculty._id, // Use the faculty._id we found, not req.params.id
      facultyFields,
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email')
      .populate('department', 'name code')
      .populate('subjects', 'name subjectCode');

    res.status(200).json({
      success: true,
      data: updatedFaculty
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all faculty (Admin only)
// @route   GET /api/faculty
// @access  Private/Admin
const getAllFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.find()
      .populate('userId', 'name email')
      .populate('department', 'name code')
      .populate('subjects', 'name subjectCode')
      .sort({ employeeId: 1 });

    res.status(200).json({
      success: true,
      count: faculty.length,
      data: faculty
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addFaculty,
  getMyProfile,
  updateFaculty,
  getAllFaculty
};