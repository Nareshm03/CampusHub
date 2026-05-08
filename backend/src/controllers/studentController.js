const Student = require('../models/Student');
const User = require('../models/User');
const Alumni = require('../models/Alumni');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// @desc    Add new student with user account (Admin only)
// @route   POST /api/students
// @access  Private/Admin
const addStudent = async (req, res, next) => {
  try {
    const { 
      name,
      email,
      password,
      usn, 
      department, 
      semester, 
      subjects, 
      phone, 
      address, 
      guardianName, 
      guardianPhone, 
      dateOfBirth, 
      admissionYear 
    } = req.body;

    // Debug: Log received data
    console.log('Received student data:', {
      name,
      email,
      hasPassword: !!password,
      usn,
      department,
      semester,
      phone,
      guardianName,
      guardianPhone
    });

    // Validate required fields
    if (!name || !email || !password || !usn || !department || !semester) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields: name, email, password, usn, department, and semester'
      });
    }

    // Create user account first
    const user = await User.create({
      name,
      email,
      password,
      role: 'STUDENT',
      department
    });

    // Create student profile
    const student = await Student.create({
      userId: user._id,
      usn,
      department,
      semester,
      subjects,
      phone,
      address,
      guardianName,
      guardianPhone,
      dateOfBirth,
      admissionYear
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('userId', 'name email')
      .populate('department', 'name code')
      .populate('subjects', 'name subjectCode');

    res.status(201).json({
      success: true,
      data: populatedStudent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student's own profile (Student only)
// @route   GET /api/students/profile
// @access  Private/Student
const getMyProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate('userId', 'name email phone address dateOfBirth')
      .populate('department', 'name code')
      .populate('subjects', 'name subjectCode semester');

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update student profile (Admin only)
// @route   PUT /api/students/:id
// @access  Private/Admin
const updateStudent = async (req, res, next) => {
  try {
    // First find the student to get the userId
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Extract user-related fields (name, email, password) from request body
    const { name, email, password, ...studentFields } = req.body;
    
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
        student.userId,
        userUpdateData,
        { new: true, runValidators: true }
      );
    }

    // Update Student model with remaining fields
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      studentFields,
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email')
      .populate('department', 'name code')
      .populate('subjects', 'name subjectCode');

    res.status(200).json({
      success: true,
      data: updatedStudent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all students (Admin only)
// @route   GET /api/students
// @access  Private/Admin
const getAllStudents = async (req, res, next) => {
  try {
    let query = {};
    
    // If user is FACULTY, filter by their department
    if (req.user.role === 'FACULTY') {
      const Faculty = require('../models/Faculty');
      const faculty = await Faculty.findOne({ userId: req.user.id });
      
      if (!faculty) {
        return res.status(404).json({
          success: false,
          error: 'Faculty profile not found'
        });
      }
      
      query.department = faculty.department;
    }
    
    const students = await Student.find(query)
      .populate('userId', 'name email')
      .populate('department', 'name code')
      .populate('subjects', 'name subjectCode')
      .sort({ usn: 1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get students by department and semester (Faculty/Admin)
// @route   GET /api/students/department/:departmentId/semester/:semester
// @access  Private/Faculty/Admin
const getStudentsByDepartmentAndSemester = async (req, res, next) => {
  try {
    const { departmentId, semester } = req.params;

    const students = await Student.find({
      department: departmentId,
      semester: parseInt(semester)
    })
      .populate('userId', 'name email')
      .populate('department', 'name code')
      .populate('subjects', 'name subjectCode')
      .sort({ usn: 1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload student profile photo
// @route   POST /api/students/:id/photo
// @access  Private/Admin/Student
const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload an image file'
      });
    }

    let student;
    
    // Check if this is the /me/photo endpoint
    if (req.route.path === '/me/photo') {
      // Find student by user ID
      student = await Student.findOne({ userId: req.user.id });
    } else {
      // Validate student ID format
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid student ID format'
        });
      }
      student = await Student.findById(req.params.id);
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Delete old photo if exists
    if (student.profilePhoto) {
      const oldPhotoPath = path.join(__dirname, '../../uploads/students/', student.profilePhoto);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update student with new photo
    student.profilePhoto = req.file.filename;
    await student.save();

    res.status(200).json({
      success: true,
      data: {
        profilePhoto: student.profilePhoto
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Mark student as alumni
// @route   POST /api/students/:id/graduate
// @access  Private/Admin
const markAsAlumni = async (req, res, next) => {
  try {
    const { graduationYear, currentCompany, currentPosition, contactEmail, contactPhone } = req.body;

    // Validate required fields
    if (!graduationYear || graduationYear < 2000 || graduationYear > new Date().getFullYear()) {
      return res.status(400).json({
        success: false,
        error: 'Valid graduation year is required'
      });
    }

    // Validate student ID format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID format'
      });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    if (student.isAlumni) {
      return res.status(400).json({
        success: false,
        error: 'Student is already marked as alumni'
      });
    }

    // Update student status
    student.isAlumni = true;
    student.graduationYear = graduationYear;
    await student.save();

    // Create alumni record
    const alumni = await Alumni.create({
      studentId: student._id,
      graduationYear,
      currentCompany: currentCompany?.trim() || '',
      currentPosition: currentPosition?.trim() || '',
      contactEmail: contactEmail?.trim() || '',
      contactPhone: contactPhone?.trim() || ''
    });

    res.status(200).json({
      success: true,
      data: { student, alumni }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all alumni
// @route   GET /api/students/alumni
// @access  Private/Admin
const getAllAlumni = async (req, res, next) => {
  try {
    const alumni = await Alumni.find({ isActive: true })
      .populate({
        path: 'studentId',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'department', select: 'name code' }
        ]
      })
      .sort({ graduationYear: -1 });

    res.status(200).json({
      success: true,
      count: alumni.length,
      data: alumni
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enroll students in a subject
// @route   POST /api/students/enroll-subject
// @access  Private/Admin
const enrollStudentsInSubject = async (req, res, next) => {
  try {
    const { studentIds, subjectId } = req.body;

    console.log('Enrollment request:', { studentIds, subjectId });

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide student IDs as an array'
      });
    }

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a subject ID'
      });
    }

    // Update all students to add the subject to their subjects array
    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      { $addToSet: { subjects: subjectId } }
    );

    console.log('Enrollment result:', result);

    res.status(200).json({
      success: true,
      message: `Successfully enrolled ${result.modifiedCount} students in the subject`,
      data: { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount }
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    next(error);
  }
};

module.exports = {
  addStudent,
  getMyProfile,
  updateStudent,
  getAllStudents,
  getStudentsByDepartmentAndSemester,
  uploadProfilePhoto,
  markAsAlumni,
  getAllAlumni,
  enrollStudentsInSubject
};