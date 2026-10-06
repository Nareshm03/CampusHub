const Student = require('../models/Student');
const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const Settings = require('../models/Settings');
const csv = require('csv-parser');
const { createObjectCsvStringifier } = require('csv-writer');
const fs = require('fs');
const path = require('path');

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Admin only
const getAnalytics = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalFaculty = await User.countDocuments({ role: 'FACULTY' });
    
    // Average performance as a percentage (marks/maxMarks), the same scale
    // the dashboard labels as GPA. Raw-mark averages would mis-weight rows
    // with different maxMarks.
    const avgGPA = await Marks.aggregate([
      { $project: { pct: { $cond: [{ $gt: ['$maxMarks', 0] }, { $multiply: [{ $divide: ['$marks', '$maxMarks'] }, 100] }, 0] } } },
      { $group: { _id: null, avgMarks: { $avg: '$pct' } } }
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
    
    // Grade distribution (percentage buckets so rows with different
    // maxMarks land in the correct band)
    const gradeDistribution = await Marks.aggregate([
      { $project: { pct: { $cond: [{ $gt: ['$maxMarks', 0] }, { $multiply: [{ $divide: ['$marks', '$maxMarks'] }, 100] }, 0] } } },
      { $bucket: {
        groupBy: '$pct',
        boundaries: [0, 40, 50, 60, 70, 80, 90, 101],
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

// @desc    Import data from CSV (ADMIN only, validated before write)
// @route   POST /api/admin/import (multipart: file + type)
// @access  Admin only
const IMPORT_TYPES = ['students', 'faculty', 'users', 'marks', 'attendance'];

const gradeForPercentage = (pct) => {
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  return 'F';
};

const isValidEmail = (v) => typeof v === 'string' && /^\S+@\S+\.\S+$/.test(v.trim());

const resolveDepartment = async (value) => {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  const mongoose = require('mongoose');
  if (mongoose.Types.ObjectId.isValid(v)) {
    return Department.findById(v);
  }
  return Department.findOne({ name: new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
};

const parseCsvBuffer = (buffer) => new Promise((resolve, reject) => {
  const rows = [];
  const { Readable } = require('stream');
  Readable.from([buffer.toString('utf8')])
    .pipe(csv())
    .on('data', (row) => rows.push(row))
    .on('error', (err) => reject(err))
    .on('end', () => resolve(rows));
});

const randomPassword = () => {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 's';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + '7';
};

const importCSV = async (req, res) => {
  try {
    const { type } = req.body;
    if (!IMPORT_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: `Unsupported import type. Supported: ${IMPORT_TYPES.join(', ')}` });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded (field name must be "file")' });
    }

    let rows;
    try {
      rows = await parseCsvBuffer(req.file.buffer);
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid CSV file: ' + err.message });
    }
    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'CSV file contains no data rows' });
    }

    const handlers = { students: importStudentRows, faculty: importFacultyRows, users: importUserRows, marks: importMarksRows, attendance: importAttendanceRows };
    const result = await handlers[type](rows, req.user);

    res.json({
      success: true,
      data: {
        type,
        total: rows.length,
        imported: result.imported,
        updated: result.updated || 0,
        skipped: result.skipped,
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 100),
        credentials: result.credentials || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const newResult = () => ({ imported: 0, updated: 0, skipped: 0, errors: [], credentials: [] });
const rowError = (result, index, message) => {
  result.skipped += 1;
  result.errors.push({ row: index + 2, error: message });
};

async function importStudentRows(rows, adminUser) {
  const result = newResult();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row.name || '').trim();
    const email = (row.email || '').trim();
    const usn = (row.usn || '').trim().toUpperCase();
    const semester = parseInt(row.semester);
    if (!name) { rowError(result, i, 'name is required'); continue; }
    if (!isValidEmail(email)) { rowError(result, i, 'valid email is required'); continue; }
    if (!usn) { rowError(result, i, 'usn is required'); continue; }
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) { rowError(result, i, 'semester must be 1-8'); continue; }
    const department = await resolveDepartment(row.department);
    if (!department) { rowError(result, i, `department not found: ${row.department || '(blank)'}`); continue; }
    if (await User.findOne({ email })) { rowError(result, i, `email already exists: ${email}`); continue; }
    if (await Student.findOne({ usn })) { rowError(result, i, `usn already exists: ${usn}`); continue; }
    const password = (row.password || '').trim() || randomPassword();
    if (!/[a-z]/.test(password) || !/[0-9]/.test(password) || password.length < 8) {
      rowError(result, i, 'password must be 8+ chars with a lowercase letter and a number');
      continue;
    }
    let userDoc = null;
    try {
      userDoc = await User.create({ name, email, password, role: 'STUDENT', department: department._id });
      await Student.create({
        userId: userDoc._id,
        usn,
        department: department._id,
        semester,
        phone: (row.phone || '').trim() || undefined
      });
      result.imported += 1;
      if (!row.password || !String(row.password).trim()) {
        result.credentials.push({ email, password });
      }
    } catch (err) {
      // Compensate: never leave an orphan User when the profile fails.
      if (userDoc) await User.deleteOne({ _id: userDoc._id }).catch(() => {});
      rowError(result, i, err.message);
    }
  }
  return result;
}

async function importFacultyRows(rows, adminUser) {
  const result = newResult();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row.name || '').trim();
    const email = (row.email || '').trim();
    const employeeId = (row.employeeId || '').trim().toUpperCase();
    if (!name) { rowError(result, i, 'name is required'); continue; }
    if (!isValidEmail(email)) { rowError(result, i, 'valid email is required'); continue; }
    if (!employeeId) { rowError(result, i, 'employeeId is required'); continue; }
    const department = await resolveDepartment(row.department);
    if (!department) { rowError(result, i, `department not found: ${row.department || '(blank)'}`); continue; }
    const designation = (row.designation || '').trim();
    const qualification = (row.qualification || '').trim();
    const experience = row.experience === undefined || row.experience === '' ? NaN : Number(row.experience);
    if (!designation) { rowError(result, i, 'designation is required'); continue; }
    if (!qualification) { rowError(result, i, 'qualification is required'); continue; }
    if (!Number.isFinite(experience) || experience < 0) { rowError(result, i, 'experience must be a number >= 0'); continue; }
    if (await User.findOne({ email })) { rowError(result, i, `email already exists: ${email}`); continue; }
    const Faculty = require('../models/Faculty');
    if (await Faculty.findOne({ employeeId })) { rowError(result, i, `employeeId already exists: ${employeeId}`); continue; }
    const password = (row.password || '').trim() || randomPassword();
    if (!/[a-z]/.test(password) || !/[0-9]/.test(password) || password.length < 8) {
      rowError(result, i, 'password must be 8+ chars with a lowercase letter and a number');
      continue;
    }
    let userDoc = null;
    try {
      userDoc = await User.create({ name, email, password, role: 'FACULTY', department: department._id });
      await Faculty.create({
        userId: userDoc._id,
        employeeId,
        department: department._id,
        designation,
        qualification,
        experience,
        dateOfJoining: row.dateOfJoining ? new Date(row.dateOfJoining) : new Date()
      });
      result.imported += 1;
      if (!row.password || !String(row.password).trim()) {
        result.credentials.push({ email, password });
      }
    } catch (err) {
      if (userDoc) await User.deleteOne({ _id: userDoc._id }).catch(() => {});
      rowError(result, i, err.message);
    }
  }
  return result;
}

async function importUserRows(rows, adminUser) {
  const result = newResult();
  const roles = ['ADMIN', 'FACULTY', 'STUDENT', 'PARENT'];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row.name || '').trim();
    const email = (row.email || '').trim();
    const role = (row.role || '').trim().toUpperCase();
    if (!name) { rowError(result, i, 'name is required'); continue; }
    if (!isValidEmail(email)) { rowError(result, i, 'valid email is required'); continue; }
    if (!roles.includes(role)) { rowError(result, i, `role must be one of ${roles.join(', ')}`); continue; }
    const password = (row.password || '').trim() || randomPassword();
    if (!/[a-z]/.test(password) || !/[0-9]/.test(password) || password.length < 8) {
      rowError(result, i, 'password must be 8+ chars with a lowercase letter and a number');
      continue;
    }
    if (await User.findOne({ email })) { rowError(result, i, `email already exists: ${email}`); continue; }
    const payload = { name, email, password, role };
    if (role === 'PARENT') {
      const usn = (row.linkedStudentUsn || '').trim().toUpperCase();
      if (!usn) { rowError(result, i, 'linkedStudentUsn is required for PARENT role'); continue; }
      const linked = await Student.findOne({ usn });
      if (!linked) { rowError(result, i, `linked student not found: ${usn}`); continue; }
      payload.linkedStudentId = linked._id;
    } else {
      const department = await resolveDepartment(row.department);
      if (!department) { rowError(result, i, `department not found: ${row.department || '(blank)'}`); continue; }
      payload.department = department._id;
    }
    try {
      await User.create(payload);
      result.imported += 1;
      if (!row.password || !String(row.password).trim()) {
        result.credentials.push({ email, password });
      }
    } catch (err) {
      rowError(result, i, err.message);
    }
  }
  return result;
}

async function importMarksRows(rows, adminUser) {
  const result = newResult();
  const examTypes = ['INTERNAL', 'EXTERNAL', 'ASSIGNMENT', 'QUIZ'];
  const Subject = require('../models/Subject');
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const usn = (row.usn || '').trim().toUpperCase();
    const subjectCode = (row.subjectCode || '').trim().toUpperCase();
    const examType = (row.examType || '').trim().toUpperCase();
    const examName = (row.examName || '').trim();
    const marks = parseFloat(row.marks);
    const maxMarks = parseFloat(row.maxMarks);
    if (!usn) { rowError(result, i, 'usn is required'); continue; }
    if (!subjectCode) { rowError(result, i, 'subjectCode is required'); continue; }
    if (!examTypes.includes(examType)) { rowError(result, i, `examType must be one of ${examTypes.join(', ')}`); continue; }
    if (!examName) { rowError(result, i, 'examName is required'); continue; }
    if (!Number.isFinite(marks) || marks < 0) { rowError(result, i, 'marks must be a number >= 0'); continue; }
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) { rowError(result, i, 'maxMarks must be a number > 0'); continue; }
    if (marks > maxMarks) { rowError(result, i, 'marks cannot exceed maxMarks'); continue; }
    const student = await Student.findOne({ usn });
    if (!student) { rowError(result, i, `student not found: ${usn}`); continue; }
    const subject = (await Subject.findOne({ subjectCode })) || (await Subject.findOne({ subjectCode: subjectCode.toUpperCase() }));
    if (!subject) { rowError(result, i, `subject not found: ${subjectCode}`); continue; }
    const grade = (row.grade || '').trim() || gradeForPercentage((marks / maxMarks) * 100);
    try {
      const existing = await Marks.findOne({ student: student._id, subject: subject._id, examType, examName });
      if (existing) {
        existing.marks = marks;
        existing.maxMarks = maxMarks;
        existing.grade = grade;
        existing.enteredBy = adminUser._id;
        await existing.save();
        result.updated += 1;
        result.imported += 1;
      } else {
        await Marks.create({ student: student._id, subject: subject._id, examType, examName, marks, maxMarks, grade, enteredBy: adminUser._id });
        result.imported += 1;
      }
    } catch (err) {
      rowError(result, i, err.message);
    }
  }
  return result;
}

async function importAttendanceRows(rows, adminUser) {
  const result = newResult();
  const statuses = ['PRESENT', 'ABSENT', 'LATE'];
  const Subject = require('../models/Subject');
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const usn = (row.usn || '').trim().toUpperCase();
    const subjectCode = (row.subjectCode || '').trim().toUpperCase();
    const status = (row.status || '').trim().toUpperCase();
    const date = row.date ? new Date(row.date) : null;
    if (!usn) { rowError(result, i, 'usn is required'); continue; }
    if (!subjectCode) { rowError(result, i, 'subjectCode is required'); continue; }
    if (!statuses.includes(status)) { rowError(result, i, `status must be one of ${statuses.join(', ')}`); continue; }
    if (!date || Number.isNaN(date.getTime())) { rowError(result, i, 'valid date is required (YYYY-MM-DD)'); continue; }
    const student = await Student.findOne({ usn });
    if (!student) { rowError(result, i, `student not found: ${usn}`); continue; }
    const subject = (await Subject.findOne({ subjectCode })) || (await Subject.findOne({ subjectCode: subjectCode.toUpperCase() }));
    if (!subject) { rowError(result, i, `subject not found: ${subjectCode}`); continue; }
    try {
      await Attendance.create({ student: student._id, subject: subject._id, date, status, markedBy: adminUser._id });
      result.imported += 1;
    } catch (err) {
      rowError(result, i, err.code === 11000 ? 'duplicate attendance record for student/subject/date' : err.message);
    }
  }
  return result;
}

// @desc    Export real database data to CSV (ADMIN only)
// @route   GET /api/admin/export/:type
// @access  Admin only
const EXPORT_TYPES = ['students', 'faculty', 'users', 'marks', 'attendance'];

const exportCSV = async (req, res) => {
  try {
    const { type } = req.params;
    if (!EXPORT_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: `Unsupported export type. Supported: ${EXPORT_TYPES.join(', ')}` });
    }

    const builders = {
      students: exportStudents,
      faculty: exportFaculty,
      users: exportUsers,
      marks: exportMarks,
      attendance: exportAttendance
    };
    const { header, records } = await builders[type]();

    const csvStringifier = createObjectCsvStringifier({ header });
    const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    const timestamp = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}_${timestamp}.csv"`
    });
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

async function exportStudents() {
  const rows = await Student.find()
    .populate('department', 'name')
    .populate('userId', 'name email')
    .sort({ usn: 1 });
  return {
    header: [
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' },
      { id: 'usn', title: 'USN' },
      { id: 'department', title: 'Department' },
      { id: 'semester', title: 'Semester' },
      { id: 'phone', title: 'Phone' }
    ],
    records: rows.map((s) => ({
      name: s.userId?.name || '',
      email: s.userId?.email || '',
      usn: s.usn,
      department: s.department?.name || '',
      semester: s.semester,
      phone: s.phone || ''
    }))
  };
}

async function exportFaculty() {
  const Faculty = require('../models/Faculty');
  const rows = await Faculty.find()
    .populate('department', 'name')
    .populate('userId', 'name email')
    .sort({ employeeId: 1 });
  return {
    header: [
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' },
      { id: 'employeeId', title: 'Employee ID' },
      { id: 'department', title: 'Department' },
      { id: 'designation', title: 'Designation' },
      { id: 'qualification', title: 'Qualification' },
      { id: 'experience', title: 'Experience' }
    ],
    records: rows.map((f) => ({
      name: f.userId?.name || '',
      email: f.userId?.email || '',
      employeeId: f.employeeId,
      department: f.department?.name || '',
      designation: f.designation || '',
      qualification: f.qualification || '',
      experience: f.experience ?? ''
    }))
  };
}

async function exportUsers() {
  const rows = await User.find()
    .populate('department', 'name')
    .select('name email role department')
    .sort({ email: 1 });
  return {
    header: [
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' },
      { id: 'role', title: 'Role' },
      { id: 'department', title: 'Department' }
    ],
    records: rows.map((u) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department?.name || ''
    }))
  };
}

async function exportMarks() {
  const rows = await Marks.find()
    .populate('student', 'usn')
    .populate('subject', 'subjectCode')
    .sort({ createdAt: -1 })
    .limit(10000);
  return {
    header: [
      { id: 'usn', title: 'USN' },
      { id: 'subjectCode', title: 'Subject Code' },
      { id: 'examType', title: 'Exam Type' },
      { id: 'examName', title: 'Exam Name' },
      { id: 'marks', title: 'Marks' },
      { id: 'maxMarks', title: 'Max Marks' },
      { id: 'grade', title: 'Grade' }
    ],
    records: rows.map((m) => ({
      usn: m.student?.usn || '',
      subjectCode: m.subject?.subjectCode || '',
      examType: m.examType,
      examName: m.examName,
      marks: m.marks,
      maxMarks: m.maxMarks,
      grade: m.grade
    }))
  };
}

async function exportAttendance() {
  const rows = await Attendance.find()
    .populate('student', 'usn')
    .populate('subject', 'subjectCode')
    .sort({ date: -1 })
    .limit(10000);
  return {
    header: [
      { id: 'usn', title: 'USN' },
      { id: 'subjectCode', title: 'Subject Code' },
      { id: 'date', title: 'Date' },
      { id: 'status', title: 'Status' }
    ],
    records: rows.map((a) => ({
      usn: a.student?.usn || '',
      subjectCode: a.subject?.subjectCode || '',
      date: a.date ? new Date(a.date).toISOString().split('T')[0] : '',
      status: a.status
    }))
  };
};

// @desc    Get academic reports (real database values, no mocks)
// @route   GET /api/admin/academic-reports
// @access  Admin only
const getAcademicReports = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { semester, department } = req.query;

    // Build student-scope filter safely ('all'/missing means no constraint)
    const studentFilter = {};
    if (semester !== undefined && semester !== 'all' && semester !== '') {
      const sem = parseInt(semester);
      if (Number.isInteger(sem)) studentFilter.semester = sem;
    }
    if (department !== undefined && department !== 'all' && department !== '') {
      if (!mongoose.Types.ObjectId.isValid(department)) {
        return res.status(400).json({ success: false, error: 'Invalid department ID' });
      }
      studentFilter.department = new mongoose.Types.ObjectId(department);
    }

    const totalStudents = await Student.countDocuments(studentFilter);
    const scopedIds = await Student.find(studentFilter).select('_id');
    const studentIds = scopedIds.map((s) => s._id);
    const marksFilter = studentIds.length > 0 ? { student: { $in: studentIds } } : { student: null };

    // Pass rate: share of mark rows at/above 40%. CGPA: avg percentage / 9.5.
    // Distinction: share of rows at/above 75%.
    const [rateStats] = await Marks.aggregate([
      { $match: marksFilter },
      { $project: { pct: { $cond: [{ $gt: ['$maxMarks', 0] }, { $multiply: [{ $divide: ['$marks', '$maxMarks'] }, 100] }, 0] } } },
      { $group: {
        _id: null,
        count: { $sum: 1 },
        pass: { $sum: { $cond: [{ $gte: ['$pct', 40] }, 1, 0] } },
        distinction: { $sum: { $cond: [{ $gte: ['$pct', 75] }, 1, 0] } },
        avgPct: { $avg: '$pct' }
      } }
    ]);
    const rowCount = rateStats?.count || 0;
    const passRate = rowCount > 0 ? Math.round((rateStats.pass / rowCount) * 1000) / 10 : 0;
    const distinction = rowCount > 0 ? Math.round((rateStats.distinction / rowCount) * 1000) / 10 : 0;
    const averageCGPA = rateStats ? Math.round(Math.min(10, rateStats.avgPct / 9.5) * 100) / 100 : 0;

    // Semester performance (average marks by student semester)
    const semesterPerformance = await Marks.aggregate([
      { $match: marksFilter },
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $group: { _id: '$student.semester', averageMarks: { $avg: '$marks' } } },
      { $project: { _id: 0, semester: '$_id', averageMarks: { $round: ['$averageMarks', 2] } } },
      { $sort: { semester: 1 } }
    ]);

    // Department comparison (average CGPA by department)
    const departmentComparison = await Marks.aggregate([
      { $match: marksFilter },
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $lookup: { from: 'departments', localField: 'student.department', foreignField: '_id', as: 'dept' } },
      { $unwind: '$dept' },
      { $group: { _id: '$dept.name', avgMarks: { $avg: '$marks' }, avgMax: { $avg: '$maxMarks' } } },
      { $project: {
        _id: 0,
        department: '$_id',
        averageCGPA: { $round: [{ $min: [10, { $divide: [{ $multiply: [{ $divide: ['$avgMarks', '$avgMax'] }, 100] }, 9.5] }] }, 2] }
      } },
      { $sort: { department: 1 } }
    ]);

    // Subject analysis (top 10 subjects by average percentage)
    const subjectAnalysis = await Marks.aggregate([
      { $match: marksFilter },
      { $group: { _id: '$subject', avgMarks: { $avg: '$marks' }, avgMax: { $avg: '$maxMarks' }, entries: { $sum: 1 } } },
      { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject' } },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      { $project: {
        _id: 0,
        subject: '$subject.name',
        subjectCode: '$subject.subjectCode',
        averageMarks: { $round: ['$avgMarks', 2] },
        averagePercentage: { $round: [{ $cond: [{ $gt: ['$avgMax', 0] }, { $multiply: [{ $divide: ['$avgMarks', '$avgMax'] }, 100] }, 0] }, 1] },
        entries: 1
      } },
      { $sort: { averagePercentage: -1 } },
      { $limit: 10 }
    ]);

    // Performance trends (average marks by entry month, last 6 buckets with data)
    const performanceTrends = await Marks.aggregate([
      { $match: marksFilter },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        averageMarks: { $avg: '$marks' }
      } },
      { $project: {
        _id: 0,
        month: { $concat: [{ $toString: '$_id.year' }, '-', { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] }] },
        averageMarks: { $round: ['$averageMarks', 2] }
      } },
      { $sort: { month: 1 } },
      { $limit: 12 }
    ]);

    // Detailed data (latest 100 mark rows with resolved names)
    const detailedData = await Marks.find(marksFilter)
      .populate('student', 'usn')
      .populate({ path: 'student', populate: { path: 'userId', select: 'name' } })
      .populate('subject', 'name subjectCode')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const detailed = detailedData.map((m) => ({
      usn: m.student?.usn || '',
      studentName: m.student?.userId?.name || '',
      subject: m.subject?.name || '',
      subjectCode: m.subject?.subjectCode || '',
      examType: m.examType,
      examName: m.examName,
      marks: m.marks,
      maxMarks: m.maxMarks,
      percentage: m.maxMarks > 0 ? Math.round((m.marks / m.maxMarks) * 1000) / 10 : 0
    }));

    res.json({
      success: true,
      data: {
        summary: { totalStudents, passRate, averageCGPA, distinction },
        semesterPerformance,
        departmentComparison,
        performanceTrends,
        subjectAnalysis,
        detailedData: detailed
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