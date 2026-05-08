/**
 * Example controller demonstrating RBAC & ABAC usage
 * This shows how to properly integrate permission checks in your controllers
 */

const { canAccessResource, RESOURCES, ACTIONS } = require('../middleware/rbac');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

/**
 * Example: Get student with ABAC check
 */
exports.getStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await Student.findById(studentId);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }
    
    // ABAC check - verify user can access this specific student
    const canAccess = canAccessResource(
      req.user,
      RESOURCES.STUDENT,
      ACTIONS.READ,
      student
    );
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'You don\'t have permission to view this student'
      });
    }
    
    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching student'
    });
  }
};

/**
 * Example: Mark attendance with context-based ABAC
 */
exports.markAttendanceExample = async (req, res) => {
  try {
    const { subject, student, status, date } = req.body;
    
    // Get faculty subjects for ABAC context
    const Faculty = require('../models/Faculty');
    const faculty = await Faculty.findOne({ user: req.user._id });
    
    if (!faculty) {
      return res.status(404).json({
        success: false,
        error: 'Faculty profile not found'
      });
    }
    
    // Create attendance record
    const attendanceData = {
      subject,
      student,
      status,
      date,
      markedBy: faculty._id
    };
    
    // ABAC check with context
    const canAccess = canAccessResource(
      req.user,
      RESOURCES.ATTENDANCE,
      ACTIONS.CREATE,
      attendanceData,
      { facultySubjects: faculty.subjects.map(s => s.toString()) }
    );
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'You can only mark attendance for subjects you teach'
      });
    }
    
    const attendance = await Attendance.create(attendanceData);
    
    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Error marking attendance'
    });
  }
};

/**
 * Example: List students with automatic filtering
 */
exports.listStudentsExample = async (req, res) => {
  try {
    const query = {};
    
    // Apply role-based filtering
    if (req.user.role === 'STUDENT') {
      // Students can only see their own profile
      query._id = req.user._id;
    } else if (req.user.role === 'FACULTY') {
      // Faculty can see students in their classes
      // This would require additional logic to get faculty's classes
      // For now, allow all
    }
    
    // Apply institution filter (multi-tenancy)
    if (req.user.institution) {
      query.institution = req.user.institution;
    }
    
    const students = await Student.find(query);
    
    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error listing students:', error);
    res.status(500).json({
      success: false,
      error: 'Error listing students'
    });
  }
};

/**
 * Example: Update resource with ownership check
 */
exports.updateProfileExample = async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await Student.findById(studentId);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }
    
    // ABAC check for update permission
    const canUpdate = canAccessResource(
      req.user,
      RESOURCES.STUDENT,
      ACTIONS.UPDATE,
      student
    );
    
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own profile'
      });
    }
    
    // Update student
    Object.assign(student, req.body);
    await student.save();
    
    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating student'
    });
  }
};

/**
 * Example: Approve leave (requires special permission)
 */
exports.approveLeaveExample = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const Leave = require('../models/Leave');
    const leave = await Leave.findById(leaveId);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave application not found'
      });
    }
    
    // Check if user is department head
    const Faculty = require('../models/Faculty');
    const faculty = await Faculty.findOne({ user: req.user._id });
    const isDepartmentHead = faculty && faculty.isDepartmentHead === true;
    
    // ABAC check with department head context
    const canApprove = canAccessResource(
      req.user,
      RESOURCES.LEAVE,
      ACTIONS.APPROVE,
      leave,
      { isDepartmentHead }
    );
    
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        error: 'Only department heads or admins can approve leave'
      });
    }
    
    leave.status = 'APPROVED';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    await leave.save();
    
    res.status(200).json({
      success: true,
      data: leave
    });
  } catch (error) {
    console.error('Error approving leave:', error);
    res.status(500).json({
      success: false,
      error: 'Error approving leave'
    });
  }
};
