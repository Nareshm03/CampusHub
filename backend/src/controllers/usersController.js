const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');

// @desc    Get all users with pagination and search
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    let searchQuery = {};
    if (role) searchQuery.role = role;
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(searchQuery)
      .populate('department', 'name code')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password');

    const total = await User.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (admin can delete any user)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete related profile data
    if (user.role === 'STUDENT') {
      await Student.findOneAndDelete({ userId: user._id });
      await Marks.deleteMany({ student: user._id });
      await Attendance.deleteMany({ student: user._id });
    } else if (user.role === 'FACULTY') {
      await Faculty.findOneAndDelete({ userId: user._id });
      await Marks.deleteMany({ enteredBy: user._id });
      await Attendance.deleteMany({ markedBy: user._id });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (admin can edit any user)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, address, department, role } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user fields
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (address) updateFields.address = address;
    if (department) updateFields.department = department;
    if (role) updateFields.role = role;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('department', 'name code').select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove user access (disable login but keep profile)
// @route   PATCH /api/users/:id/remove-access
// @access  Private/Admin
const removeUserAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Disable account by setting a very long lock time
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { 
        lockUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Lock for 1 year
        loginAttempts: 999 // Max attempts to prevent login
      },
      { new: true }
    ).populate('department', 'name code').select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User access removed successfully. Profile data preserved.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get faculty users with pagination and search
// @route   GET /api/users/faculty
// @access  Private/Admin
const getFacultyUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    // Build search query
    let searchQuery = { role: 'FACULTY' };
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(searchQuery)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password');

    const total = await User.countDocuments(searchQuery);

    // Get faculty details for each user
    const facultyData = await Promise.all(
      users.map(async (user) => {
        const faculty = await Faculty.findOne({ userId: user._id })
          .populate('department', 'name code')
          .populate('subjects', 'name subjectCode');
        
        return {
          _id: faculty?._id || user._id, // Use Faculty _id for updates
          userId: user._id, // Keep User _id reference
          name: user.name,
          email: user.email,
          employeeId: faculty?.employeeId || null,
          department: faculty?.department || { name: user.department, code: '' },
          designation: faculty?.designation || null,
          qualification: faculty?.qualification || null,
          experience: faculty?.experience || null,
          subjects: faculty?.subjects || [],
          phone: faculty?.phone || null,
          address: faculty?.address || null,
          dateOfJoining: faculty?.dateOfJoining || null,
          status: 'active' // Default status
        };
      })
    );

    res.status(200).json({
      success: true,
      data: facultyData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get faculty users in the same department as the requester
// @route   GET /api/users/faculty/department
// @access  Private/Faculty
const getFacultyInMyDepartment = async (req, res, next) => {
  try {
    const facultyProfile = await Faculty.findOne({ userId: req.user._id });
    if (!facultyProfile) {
      return res.status(404).json({ success: false, message: 'Faculty profile not found' });
    }

    const facultyInDept = await Faculty.find({ department: facultyProfile.department })
      .populate('userId', 'name email');

    const data = facultyInDept.map(f => ({
      _id: f.userId?._id, // User ID for Timetable assignment
      name: f.userId?.name,
      email: f.userId?.email,
      facultyId: f._id
    }));

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin change any user's password (no current password required)
// @route   PUT /api/users/:id/change-password
// @access  Private/Admin
const adminChangeUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    // Enhanced password validation
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }

    // Check for lowercase and numeric
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ success: false, error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, error: 'Password must contain at least one number' });
    }

    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    // Audit log the admin password change
    const { logSecurityEvent } = require('../middleware/auditLogger');
    await logSecurityEvent('PASSWORD_CHANGED_BY_ADMIN', user._id, {
      adminId: req.user.id,
      adminName: req.user.name,
      targetUserName: user.name,
      targetUserRole: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      changedBy: 'admin'
    });

    res.status(200).json({ success: true, data: `Password for ${user.name} changed successfully` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getFacultyUsers,
  getFacultyInMyDepartment,
  deleteUser,
  updateUser,
  removeUserAccess,
  adminChangeUserPassword
};