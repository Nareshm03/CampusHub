const express = require('express');
const { protect, facultyOnly } = require('../middleware/auth');
const { addGrades, getStudentsForGrading } = require('../controllers/gradeController');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');

const router = express.Router();

// Apply protection to all routes
router.use(protect);
router.use(facultyOnly);

// Grade management
router.post('/grades', addGrades);
router.get('/grades/:subjectId', getStudentsForGrading);

// Get faculty subjects
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find({ facultyId: req.user.id });
    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get students for a subject
router.get('/students/:subjectId', async (req, res) => {
  try {
    const students = await Student.find({ subjects: req.params.subjectId })
      .populate('userId', 'name email')
      .populate('department', 'name');
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Mark attendance
router.post('/attendance', async (req, res) => {
  try {
    const { subjectId, date, attendance } = req.body;
    
    const bulkOps = attendance.map(record => ({
      updateOne: {
        filter: { studentId: record.studentId, subjectId, date },
        update: { $set: { ...record, subjectId, date, facultyId: req.user.id } },
        upsert: true
      }
    }));
    
    await Attendance.bulkWrite(bulkOps);
    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;