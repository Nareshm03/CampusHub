const Exam = require('../models/Exam');
const ExamRegistration = require('../models/ExamRegistration');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const mongoose = require('mongoose');

// Get available exams for registration
exports.getAvailableExams = async (req, res) => {
  try {
    const { semester, department, page = 1, limit = 10 } = req.query;
    const filter = { 
      status: 'upcoming', 
      registrationDeadline: { $gte: new Date() } 
    };
    
    if (semester) filter.semester = parseInt(semester);
    if (department && mongoose.Types.ObjectId.isValid(department)) {
      filter.department = department;
    }

    const skip = (page - 1) * limit;
    const exams = await Exam.find(filter)
      .populate('subject', 'name code')
      .populate('department', 'name')
      .sort({ examDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Exam.countDocuments(filter);

    res.json({ 
      success: true, 
      exams,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: exams.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Register for exam
exports.registerForExam = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { examId, formData } = req.body;
    const studentId = req.user.studentId;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student profile not found' });
    }

    const exam = await Exam.findById(examId).session(session);
    if (!exam) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (new Date() > exam.registrationDeadline) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Registration deadline passed' });
    }

    const existingRegistration = await ExamRegistration.findOne({ 
      student: studentId, 
      exam: examId 
    }).session(session);
    
    if (existingRegistration) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Already registered for this exam' });
    }

    const registrationNumber = `REG${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const registration = new ExamRegistration({
      student: studentId,
      exam: examId,
      registrationNumber,
      formData,
      feeStatus: exam.fee > 0 ? 'pending' : 'paid',
      status: exam.fee > 0 ? 'fee_pending' : 'confirmed'
    });

    if (exam.fee === 0) {
      registration.hallTicketNumber = `HT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }

    await registration.save({ session });
    await session.commitTransaction();
    
    res.json({ success: true, registration });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// Pay exam fee
exports.payExamFee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { registrationId, paymentId } = req.body;
    
    const registration = await ExamRegistration.findById(registrationId)
      .populate('exam')
      .session(session);
      
    if (!registration) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (registration.student.toString() !== req.user.studentId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    if (registration.feeStatus === 'paid') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Fee already paid' });
    }

    registration.feeStatus = 'paid';
    registration.paymentId = paymentId;
    registration.status = 'confirmed';
    registration.hallTicketNumber = `HT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    await registration.save({ session });
    await session.commitTransaction();
    
    res.json({ success: true, registration });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// Get hall ticket
exports.getHallTicket = async (req, res) => {
  try {
    const { registrationId } = req.params;
    
    const registration = await ExamRegistration.findById(registrationId)
      .populate('exam', 'title examDate duration venue maxMarks')
      .populate('student', 'usn')
      .populate({
        path: 'student',
        populate: { path: 'userId', select: 'name email' }
      });

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (registration.student._id.toString() !== req.user.studentId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    if (registration.status !== 'confirmed' || !registration.hallTicketNumber) {
      return res.status(400).json({ success: false, message: 'Hall ticket not available' });
    }

    res.json({ success: true, hallTicket: registration });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get exam results
exports.getExamResults = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    const results = await ExamResult.find({ student: studentId, isPublished: true })
      .populate('exam', 'title examDate maxMarks')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ExamResult.countDocuments({ student: studentId, isPublished: true });

    res.json({ 
      success: true, 
      results,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: results.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Request revaluation
exports.requestRevaluation = async (req, res) => {
  try {
    const { resultId } = req.body;
    
    const result = await ExamResult.findById(resultId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    if (result.student.toString() !== req.user.studentId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    if (result.revaluationRequested) {
      return res.status(400).json({ success: false, message: 'Revaluation already requested' });
    }

    // Check if revaluation window is open (e.g., within 30 days of result publication)
    const revaluationDeadline = new Date(result.createdAt);
    revaluationDeadline.setDate(revaluationDeadline.getDate() + 30);
    
    if (new Date() > revaluationDeadline) {
      return res.status(400).json({ success: false, message: 'Revaluation deadline passed' });
    }

    result.revaluationRequested = true;
    result.revaluationStatus = 'requested';
    await result.save();

    res.json({ success: true, message: 'Revaluation requested successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get student registrations
exports.getMyRegistrations = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    const registrations = await ExamRegistration.find({ student: studentId })
      .populate('exam', 'title examDate venue fee duration')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ExamRegistration.countDocuments({ student: studentId });

    res.json({ 
      success: true, 
      registrations,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: registrations.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};