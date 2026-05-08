const Student = require('../models/Student');
const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const Settings = require('../models/Settings');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Admin only
const getAnalytics = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalFaculty = await User.countDocuments({ role: 'FACULTY' });
    
    // Calculate average GPA
    const avgGPA = await Marks.aggregate([
      { $group: { _id: null, avgMarks: { $avg: '$marks' } } }
    ]);
    
    // Calculate attendance rate
    const attendanceStats = await Attendance.aggregate([
      { $group: { 
        _id: null, 
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } }
      }},
      { $project: { rate: { $multiply: [{ $divide: ['$present', '$total'] }, 100] } } }
    ]);
    
    // Department performance
    const departmentPerformance = await Marks.aggregate([
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentData' } },
      { $unwind: '$studentData' },
      { $lookup: { from: 'departments', localField: 'studentData.department', foreignField: '_id', as: 'dept' } },
      { $unwind: '$dept' },
      { $group: { _id: '$dept.name', averageMarks: { $avg: '$marks' } } },
      { $project: { _id: 0, department: '$_id', averageMarks: { $round: ['$averageMarks', 2] } } }
    ]);
    
    // Grade distribution
    const gradeDistribution = await Marks.aggregate([
      { $bucket: {
        groupBy: '$marks',
        boundaries: [0, 40, 50, 60, 70, 80, 90, 100],
        default: 'Other',
        output: { count: { $sum: 1 } }
      }},
      { $project: { 
        name: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 0] }, then: 'F (0-39)' },
              { case: { $eq: ['$_id', 40] }, then: 'C (40-49)' },
              { case: { $eq: ['$_id', 50] }, then: 'B (50-59)' },
              { case: { $eq: ['$_id', 60] }, then: 'B+ (60-69)' },
              { case: { $eq: ['$_id', 70] }, then: 'A (70-79)' },
              { case: { $eq: ['$_id', 80] }, then: 'A+ (80-89)' },
              { case: { $eq: ['$_id', 90] }, then: 'O (90-100)' }
            ],
            default: 'Other'
          }
        },
        count: 1
      }}
    ]);

    // Attendance trends by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const attendanceTrends = await Attendance.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { 
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } }
      }},
      { $project: {
        month: {
          $let: {
            vars: {
              monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            },
            in: { $arrayElemAt: ['$$monthNames', { $subtract: ['$_id.month', 1] }] }
          }
        },
        attendance: { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Semester performance (average marks by semester)
    const semesterPerformance = await Marks.aggregate([
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentData' } },
      { $unwind: '$studentData' },
      { $group: { 
        _id: '$studentData.semester', 
        averageMarks: { $avg: '$marks' },
        totalStudents: { $addToSet: '$student' }
      }},
      { $project: { 
        _id: 0,
        semester: { $concat: ['Sem ', { $toString: '$_id' }] },
        averageMarks: { $round: ['$averageMarks', 2] },
        studentCount: { $size: '$totalStudents' }
      }},
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalFaculty,
        averageGPA: avgGPA[0]?.avgMarks?.toFixed(2) || '0.0',
        attendanceRate: attendanceStats[0]?.rate?.toFixed(1) || '0',
        activeCourses: await Subject.countDocuments(),
        departmentPerformance,
        gradeDistribution,
        attendanceTrends,
        semesterPerformance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Import data from CSV
// @route   POST /api/admin/bulk/import
// @access  Admin only
const importCSV = async (req, res) => {
  try {
    const { type } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const results = [];
    const filePath = file.path;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          let imported = 0;
          
          for (const row of results) {
            switch (type) {
              case 'students':
                await Student.create({
                  name: row.name,
                  email: row.email,
                  usn: row.usn,
                  department: row.department,
                  semester: parseInt(row.semester)
                });
                break;
              case 'marks':
                await Marks.create({
                  studentUSN: row.studentUSN,
                  subjectCode: row.subjectCode,
                  examType: row.examType,
                  marks: parseFloat(row.marks),
                  maxMarks: parseFloat(row.maxMarks)
                });
                break;
              // Add other cases as needed
            }
            imported++;
          }
          
          // Clean up uploaded file
          fs.unlinkSync(filePath);
          
          res.json({ success: true, imported, message: `${imported} records imported successfully` });
        } catch (error) {
          res.status(400).json({ success: false, error: error.message });
        }
      });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Export data to CSV
// @route   GET /api/admin/bulk/export/:type
// @access  Admin only
const exportCSV = async (req, res) => {
  try {
    const { type } = req.params;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${type}_${timestamp}.csv`;
    const filepath = path.join(__dirname, '../../exports', filename);
    
    // Ensure exports directory exists
    const exportDir = path.dirname(filepath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    let data = [];
    let headers = [];
    
    switch (type) {
      case 'students':
        data = await Student.find().populate('department', 'name').populate('userId', 'name email');
        headers = [
          { id: 'name', title: 'Name' },
          { id: 'email', title: 'Email' },
          { id: 'usn', title: 'USN' },
          { id: 'department', title: 'Department' },
          { id: 'semester', title: 'Semester' }
        ];
        data = data.map(student => ({
          name: student.userId?.name || '',
          email: student.userId?.email || '',
          usn: student.usn,
          department: student.department?.name || '',
          semester: student.semester
        }));
        break;
        
      case 'marks':
        data = await Marks.find().populate('studentId').populate('subjectId');
        headers = [
          { id: 'studentUSN', title: 'Student USN' },
          { id: 'subjectCode', title: 'Subject Code' },
          { id: 'examType', title: 'Exam Type' },
          { id: 'marks', title: 'Marks' },
          { id: 'maxMarks', title: 'Max Marks' }
        ];
        data = data.map(mark => ({
          studentUSN: mark.studentId?.usn || '',
          subjectCode: mark.subjectId?.code || '',
          examType: mark.examType,
          marks: mark.marks,
          maxMarks: mark.maxMarks
        }));
        break;
    }
    
    const csvWriter = createCsvWriter({
      path: filepath,
      header: headers
    });
    
    await csvWriter.writeRecords(data);
    
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      fs.unlink(filepath, () => {});
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get academic reports
// @route   GET /api/admin/reports/academic
// @access  Admin only
const getAcademicReports = async (req, res) => {
  try {
    const { semester, department, academicYear } = req.query;
    
    // Build filter
    const filter = {};
    if (semester !== 'all') filter.semester = parseInt(semester);
    if (department !== 'all') filter.department = department;
    
    // Summary statistics
    const totalStudents = await Student.countDocuments(filter);
    const passRate = 85; // Calculate based on actual data
    const averageCGPA = 7.5; // Calculate based on actual data
    const distinction = 25; // Calculate based on actual data
    
    // Semester performance
    const semesterPerformance = await Marks.aggregate([
      { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $group: { _id: '$student.semester', averageMarks: { $avg: '$marks' } } },
      { $project: { semester: '$_id', averageMarks: { $round: ['$averageMarks', 2] } } },
      { $sort: { semester: 1 } }
    ]);
    
    // Department comparison
    const departmentComparison = await Marks.aggregate([
      { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $lookup: { from: 'departments', localField: 'student.department', foreignField: '_id', as: 'dept' } },
      { $unwind: '$dept' },
      { $group: { _id: '$dept.name', averageCGPA: { $avg: '$marks' } } },
      { $project: { department: '$_id', averageCGPA: { $round: [{ $divide: ['$averageCGPA', 10] }, 2] } } }
    ]);
    
    res.json({
      success: true,
      data: {
        summary: { totalStudents, passRate, averageCGPA, distinction },
        semesterPerformance,
        departmentComparison,
        performanceTrends: [], // Mock data
        subjectAnalysis: [], // Mock data
        detailedData: [] // Mock data
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Admin only
const getSettings = async (req, res) => {
  try {
    // Get or create settings document
    let settings = await Settings.findOne({ isActive: true });
    
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({
        academicYear: '2024-25',
        currentSemester: 1,
        gradingScale: 'CGPA',
        passingMarks: 40,
        maxMarks: 100,
        attendanceRequired: 75,
        semesterStartDate: new Date('2024-01-15'),
        semesterEndDate: new Date('2024-05-15'),
        examStartDate: new Date('2024-05-01'),
        examEndDate: new Date('2024-05-15'),
        isActive: true
      });
    }
    
    // Format dates for frontend
    const formattedSettings = {
      ...settings.toObject(),
      semesterStartDate: settings.semesterStartDate ? settings.semesterStartDate.toISOString().split('T')[0] : '',
      semesterEndDate: settings.semesterEndDate ? settings.semesterEndDate.toISOString().split('T')[0] : '',
      examStartDate: settings.examStartDate ? settings.examStartDate.toISOString().split('T')[0] : '',
      examEndDate: settings.examEndDate ? settings.examEndDate.toISOString().split('T')[0] : ''
    };
    
    res.json({ success: true, data: formattedSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { section, data } = req.body;
    
    // Get existing settings
    let settings = await Settings.findOne({ isActive: true });
    
    if (!settings) {
      // Create if doesn't exist
      settings = new Settings({ isActive: true });
    }
    
    // Update relevant fields based on data
    Object.keys(data).forEach(key => {
      if (settings.schema.paths[key]) {
        settings[key] = data[key];
      }
    });
    
    await settings.save();
    
    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAnalytics,
  importCSV,
  exportCSV,
  getAcademicReports,
  getSettings,
  updateSettings
};