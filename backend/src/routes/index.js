const express = require('express');
const authRoutes = require('./auth');
const adminRoutes = require('./adminRoutes');
const departmentRoutes = require('./departmentRoutes');
const subjectRoutes = require('./subjectRoutes');
const studentRoutes = require('./studentRoutes');
const facultyRoutes = require('./facultyRoutes');
const usersRoutes = require('./usersRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const marksRoutes = require('./marksRoutes');
const noticeRoutes = require('./noticeRoutes');
const leaveRoutes = require('./leaveRoutes');
const timetableRoutes = require('./timetableRoutes');
const reportsRoutes = require('./reportsRoutes');
const notificationRoutes = require('./notificationRoutes');
const feeRoutes = require('./feeRoutes');
const courseRoutes = require('./courseRoutes');
const gradeRoutes = require('./gradeRoutes');
const libraryRoutes = require('./libraryRoutes');
const hostelRoutes = require('./hostelRoutes');
const securityRoutes = require('./securityRoutes');
const messageRoutes = require('./messageRoutes');
const discussionRoutes = require('./discussionRoutes');
const calendarRoutes = require('./calendarRoutes');
const ticketRoutes = require('./ticketRoutes');
const assetRoutes = require('./assetRoutes');
const alumniRoutes = require('./alumniRoutes');
const examRoutes = require('./examRoutes');
const homeworkRoutes = require('./homework');
const analyticsRoutes = require('./analytics');
const digitalLibraryRoutes = require('./digitalLibrary');
const placementRoutes = require('./placements');
const facultyAnalyticsRoutes = require('./facultyAnalytics');
const auditLogRoutes = require('./auditLogs');
const assignmentRoutes = require('./assignmentRoutes');
const examScheduleRoutes = require('./examScheduleRoutes');
const parentRoutes = require('./parentRoutes');
const studyMaterialRoutes = require('./studyMaterialRoutes');
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/departments', departmentRoutes);
router.use('/subjects', subjectRoutes);
router.use('/students', studentRoutes);
router.use('/faculty', facultyRoutes);
router.use('/users', usersRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/marks', marksRoutes);
router.use('/notices', noticeRoutes);
router.use('/leaves', leaveRoutes);
router.use('/timetable', timetableRoutes);
router.use('/reports', reportsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/fees', feeRoutes);
router.use('/courses', courseRoutes);
router.use('/grades', gradeRoutes);
router.use('/library', libraryRoutes);
router.use('/hostel', hostelRoutes);
router.use('/security', securityRoutes);
router.use('/messages', messageRoutes);
router.use('/discussions', discussionRoutes);
router.use('/calendar', calendarRoutes);
router.use('/tickets', ticketRoutes);
router.use('/assets', assetRoutes);
router.use('/alumni', alumniRoutes);
router.use('/exams', examRoutes);
router.use('/homework', homeworkRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/digital-library', digitalLibraryRoutes);
router.use('/placements', placementRoutes);
router.use('/faculty-analytics', facultyAnalyticsRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/exam-schedules', examScheduleRoutes);
router.use('/parent', parentRoutes);
router.use('/study-materials', studyMaterialRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running'
  });
});

module.exports = router;