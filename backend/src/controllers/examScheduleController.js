const ExamSchedule = require('../models/ExamSchedule');
const ExamRegistration = require('../models/ExamRegistration');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');

/**
 * Create exam schedule
 * @route POST /api/v1/exam-schedules
 * @access Admin
 */
exports.createExamSchedule = async (req, res) => {
  try {
    const {
      academicYear,
      examType,
      name,
      department,
      semester,
      startDate,
      endDate,
      registrationStartDate,
      registrationEndDate,
      subjects,
      registrationFee,
      instructions
    } = req.body;

    // Validate dates
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }

    if (new Date(registrationEndDate) < new Date(registrationStartDate)) {
      return res.status(400).json({
        success: false,
        error: 'Registration end date must be after registration start date'
      });
    }

    const examSchedule = await ExamSchedule.create({
      academicYear,
      examType,
      name,
      department,
      semester,
      startDate,
      endDate,
      registrationStartDate,
      registrationEndDate,
      subjects,
      registrationFee: registrationFee || 0,
      instructions,
      createdBy: req.user._id,
      institution: req.user.institution
    });

    const populated = await ExamSchedule.findById(examSchedule._id)
      .populate('department', 'name')
      .populate('subjects.subject', 'name subjectCode')
      .populate('subjects.invigilators', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    console.error('Error creating exam schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating exam schedule',
      message: error.message
    });
  }
};

/**
 * Get all exam schedules
 * @route GET /api/v1/exam-schedules
 * @access Authenticated
 */
exports.getExamSchedules = async (req, res) => {
  try {
    const { department, semester, academicYear, examType, status } = req.query;
    const query = {};

    if (department) query.department = department;
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;
    if (examType) query.examType = examType;
    if (status) query.status = status;

    // Role-based filtering
    if (req.user.role === 'STUDENT') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        query.department = student.department;
        query.semester = student.semester;
        query.status = { $in: ['PUBLISHED', 'ONGOING', 'COMPLETED'] };
      }
    }

    // Institution filter
    if (req.user.institution) {
      query.institution = req.user.institution;
    }

    const examSchedules = await ExamSchedule.find(query)
      .populate('department', 'name')
      .populate('subjects.subject', 'name subjectCode credits')
      .populate('subjects.invigilators', 'name email')
      .populate('createdBy', 'name')
      .sort({ startDate: -1 });

    // Add registration status for students
    if (req.user.role === 'STUDENT') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        const scheduleIds = examSchedules.map(s => s._id);
        const registrations = await ExamRegistration.find({
          examSchedule: { $in: scheduleIds },
          student: student._id
        });

        const registrationMap = {};
        registrations.forEach(reg => {
          registrationMap[reg.examSchedule.toString()] = reg;
        });

        examSchedules.forEach(schedule => {
          schedule._doc.registration = registrationMap[schedule._id.toString()] || null;
        });
      }
    }

    res.status(200).json({
      success: true,
      count: examSchedules.length,
      data: examSchedules
    });
  } catch (error) {
    console.error('Error fetching exam schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching exam schedules'
    });
  }
};

/**
 * Get exam schedule by ID
 * @route GET /api/v1/exam-schedules/:id
 * @access Authenticated
 */
exports.getExamScheduleById = async (req, res) => {
  try {
    const examSchedule = await ExamSchedule.findById(req.params.id)
      .populate('department', 'name')
      .populate('subjects.subject', 'name subjectCode credits')
      .populate('subjects.invigilators', 'name email phone')
      .populate('createdBy', 'name email');

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        error: 'Exam schedule not found'
      });
    }

    // Add registration info for students
    if (req.user.role === 'STUDENT') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        const registration = await ExamRegistration.findOne({
          examSchedule: examSchedule._id,
          student: student._id
        }).populate('subjects.subject', 'name subjectCode');

        examSchedule._doc.registration = registration;
      }
    }

    // Add statistics
    const registrationCount = await ExamRegistration.countDocuments({
      examSchedule: examSchedule._id
    });

    examSchedule._doc.stats = {
      totalRegistrations: registrationCount
    };

    res.status(200).json({
      success: true,
      data: examSchedule
    });
  } catch (error) {
    console.error('Error fetching exam schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching exam schedule'
    });
  }
};

/**
 * Update exam schedule
 * @route PUT /api/v1/exam-schedules/:id
 * @access Admin
 */
exports.updateExamSchedule = async (req, res) => {
  try {
    let examSchedule = await ExamSchedule.findById(req.params.id);

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        error: 'Exam schedule not found'
      });
    }

    // Don't allow updating if exam is ongoing or completed
    if (['ONGOING', 'COMPLETED'].includes(examSchedule.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot update exam schedule with status: ${examSchedule.status}`
      });
    }

    examSchedule = await ExamSchedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('department')
      .populate('subjects.subject')
      .populate('subjects.invigilators');

    res.status(200).json({
      success: true,
      data: examSchedule
    });
  } catch (error) {
    console.error('Error updating exam schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating exam schedule'
    });
  }
};

/**
 * Delete exam schedule
 * @route DELETE /api/v1/exam-schedules/:id
 * @access Admin
 */
exports.deleteExamSchedule = async (req, res) => {
  try {
    const examSchedule = await ExamSchedule.findById(req.params.id);

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        error: 'Exam schedule not found'
      });
    }

    // Check if there are registrations
    const registrationCount = await ExamRegistration.countDocuments({
      examSchedule: examSchedule._id
    });

    if (registrationCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete exam schedule with existing registrations'
      });
    }

    await examSchedule.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Exam schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exam schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting exam schedule'
    });
  }
};

/**
 * Publish exam schedule
 * @route PUT /api/v1/exam-schedules/:id/publish
 * @access Admin
 */
exports.publishExamSchedule = async (req, res) => {
  try {
    const examSchedule = await ExamSchedule.findById(req.params.id);

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        error: 'Exam schedule not found'
      });
    }

    if (examSchedule.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Only draft schedules can be published'
      });
    }

    examSchedule.status = 'PUBLISHED';
    examSchedule.publishedAt = new Date();
    await examSchedule.save();

    res.status(200).json({
      success: true,
      data: examSchedule
    });
  } catch (error) {
    console.error('Error publishing exam schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Error publishing exam schedule'
    });
  }
};

/**
 * Register for exam
 * @route POST /api/v1/exam-schedules/:id/register
 * @access Student
 */
exports.registerForExam = async (req, res) => {
  try {
    const examSchedule = await ExamSchedule.findById(req.params.id);

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        error: 'Exam schedule not found'
      });
    }

    if (examSchedule.status !== 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        error: 'Exam registration is not open'
      });
    }

    // Check registration dates
    const now = new Date();
    if (now < examSchedule.registrationStartDate || now > examSchedule.registrationEndDate) {
      return res.status(400).json({
        success: false,
        error: 'Registration period has ended or not started yet'
      });
    }

    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    // Check if already registered
    const existingRegistration = await ExamRegistration.findOne({
      examSchedule: examSchedule._id,
      student: student._id
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        error: 'Already registered for this exam'
      });
    }

    const { subjects } = req.body; // Array of subject IDs to register for

    const registration = await ExamRegistration.create({
      examSchedule: examSchedule._id,
      student: student._id,
      subjects: subjects.map(subjectId => ({
        subject: subjectId,
        registered: true
      })),
      paymentAmount: examSchedule.registrationFee,
      institution: req.user.institution
    });

    const populated = await ExamRegistration.findById(registration._id)
      .populate('examSchedule', 'name examType startDate endDate')
      .populate('student', 'name usn email')
      .populate('subjects.subject', 'name subjectCode');

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    console.error('Error registering for exam:', error);
    res.status(500).json({
      success: false,
      error: 'Error registering for exam',
      message: error.message
    });
  }
};

/**
 * Get exam registrations
 * @route GET /api/v1/exam-schedules/:id/registrations
 * @access Admin, Faculty
 */
exports.getExamRegistrations = async (req, res) => {
  try {
    const examSchedule = await ExamSchedule.findById(req.params.id);

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        error: 'Exam schedule not found'
      });
    }

    const registrations = await ExamRegistration.find({
      examSchedule: req.params.id
    })
      .populate('student', 'name usn email phone')
      .populate('subjects.subject', 'name subjectCode')
      .sort({ registrationDate: -1 });

    // Statistics
    const stats = {
      total: registrations.length,
      confirmed: registrations.filter(r => r.status === 'CONFIRMED').length,
      pending: registrations.filter(r => r.status === 'REGISTERED').length,
      cancelled: registrations.filter(r => r.status === 'CANCELLED').length,
      paid: registrations.filter(r => r.paymentStatus === 'PAID').length
    };

    res.status(200).json({
      success: true,
      count: registrations.length,
      stats,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching registrations'
    });
  }
};

/**
 * Issue hall ticket
 * @route PUT /api/v1/exam-registrations/:id/hall-ticket
 * @access Admin
 */
exports.issueHallTicket = async (req, res) => {
  try {
    const { hallTicketNumber, subjects } = req.body;

    const registration = await ExamRegistration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    if (registration.paymentStatus !== 'PAID') {
      return res.status(400).json({
        success: false,
        error: 'Payment must be completed before issuing hall ticket'
      });
    }

    // Update subjects with hall ticket details
    if (subjects && subjects.length > 0) {
      subjects.forEach(subjectUpdate => {
        const subjectReg = registration.subjects.find(
          s => s.subject.toString() === subjectUpdate.subject
        );
        if (subjectReg) {
          subjectReg.hallTicketNumber = subjectUpdate.hallTicketNumber || hallTicketNumber;
          subjectReg.seatNumber = subjectUpdate.seatNumber;
          subjectReg.venue = subjectUpdate.venue;
        }
      });
    }

    registration.hallTicketIssued = true;
    registration.hallTicketIssuedAt = new Date();
    registration.status = 'CONFIRMED';
    await registration.save();

    const populated = await ExamRegistration.findById(registration._id)
      .populate('examSchedule', 'name examType')
      .populate('student', 'name usn')
      .populate('subjects.subject', 'name subjectCode');

    res.status(200).json({
      success: true,
      data: populated
    });
  } catch (error) {
    console.error('Error issuing hall ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Error issuing hall ticket'
    });
  }
};

/**
 * Get student's exam registrations
 * @route GET /api/v1/exam-registrations/my-registrations
 * @access Student
 */
exports.getMyExamRegistrations = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    const registrations = await ExamRegistration.find({ student: student._id })
      .populate({
        path: 'examSchedule',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .populate('subjects.subject', 'name subjectCode')
      .sort({ registrationDate: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching registrations'
    });
  }
};

module.exports = exports;
