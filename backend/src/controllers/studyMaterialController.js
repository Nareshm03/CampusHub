const path = require('path');
const fs = require('fs');
const StudyMaterial = require('../models/StudyMaterial');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper: build access filter for students
const buildAccessFilter = (user) => {
  if (user.role === 'ADMIN') return { isPublished: true };
  if (user.role === 'FACULTY') return { faculty: user._id };
  // STUDENT — resolved in controller after fetching student profile
  return null;
};

// @desc    Upload study materials (single or bulk)
// @route   POST /api/study-materials
// @access  Faculty
const uploadMaterials = async (req, res) => {
  try {
    const { title, description, category, subject, semester, academicYear, courseCode, tags, accessLevel } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one file is required' });
    }

    const subjectDoc = await Subject.findById(subject).populate('department');
    if (!subjectDoc) return res.status(404).json({ success: false, error: 'Subject not found' });

    const files = req.files.map(f => ({
      originalName: f.originalname,
      filename: f.filename,
      filepath: f.path,
      mimetype: f.mimetype,
      size: f.size
    }));

    const material = await StudyMaterial.create({
      title,
      description,
      category,
      subject,
      department: subjectDoc.department._id,
      faculty: req.user._id,
      semester: Number(semester),
      academicYear,
      courseCode: courseCode || subjectDoc.subjectCode,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      files,
      accessLevel: accessLevel || 'ALL_STUDENTS',
      isPublished: true
    });

    await material.populate([
      { path: 'subject', select: 'name subjectCode' },
      { path: 'department', select: 'name' },
      { path: 'faculty', select: 'name email' }
    ]);

    // Notify enrolled students
    if (accessLevel !== 'FACULTY_ONLY') {
      _notifyStudents(material, req.user).catch(() => {});
    }

    res.status(201).json({ success: true, data: material });
  } catch (error) {
    // Clean up uploaded files on error
    if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
    res.status(400).json({ success: false, error: error.message });
  }
};

// Background: notify students enrolled in the subject
const _notifyStudents = async (material, uploader) => {
  try {
    const students = await Student.find({ subjects: material.subject._id }).select('userId');
    const recipientIds = students.map(s => s.userId);
    if (recipientIds.length === 0) return;
    const notifications = recipientIds.map(recipientId => ({
      recipient: recipientId,
      sender: uploader._id,
      title: `New Study Material: ${material.title}`,
      message: `${uploader.name} uploaded new ${material.category.replace(/_/g, ' ').toLowerCase()} for ${material.subject?.name || 'your subject'} (Sem ${material.semester})`,
      type: 'INFO',
      priority: 'MEDIUM',
      data: { materialId: material._id, type: 'STUDY_MATERIAL' }
    }));
    await Notification.insertMany(notifications);
  } catch { /* non-critical */ }
};

// @desc    Get all materials (faculty sees own, students see accessible)
// @route   GET /api/study-materials
// @access  Faculty, Student, Admin
const getMaterials = async (req, res) => {
  try {
    const { page = 1, limit = 12, category, semester, subject, academicYear, search, department } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (req.user.role === 'FACULTY') {
      filter.faculty = req.user._id;
    } else if (req.user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: req.user._id });
      if (!student) return res.status(404).json({ success: false, error: 'Student profile not found' });
      filter.isPublished = true;
      filter.accessLevel = { $in: ['ALL_STUDENTS'] };
      filter.department = student.department;
    } else {
      filter.isPublished = true;
    }

    if (category) filter.category = category;
    if (semester) filter.semester = Number(semester);
    if (subject) filter.subject = subject;
    if (academicYear) filter.academicYear = academicYear;
    if (department && req.user.role === 'ADMIN') filter.department = department;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { courseCode: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const [materials, total] = await Promise.all([
      StudyMaterial.find(filter)
        .populate('subject', 'name subjectCode')
        .populate('department', 'name')
        .populate('faculty', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      StudyMaterial.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: materials.length,
      total,
      pagination: { page: Number(page), pages: Math.ceil(total / limit) },
      data: materials
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single material
// @route   GET /api/study-materials/:id
// @access  Authenticated
const getMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id)
      .populate('subject', 'name subjectCode')
      .populate('department', 'name')
      .populate('faculty', 'name email');

    if (!material) return res.status(404).json({ success: false, error: 'Material not found' });

    // Track view (avoid duplicates per user)
    const alreadyViewed = material.viewedBy.some(v => v.user?.toString() === req.user._id.toString());
    if (!alreadyViewed) {
      await StudyMaterial.findByIdAndUpdate(req.params.id, {
        $inc: { viewCount: 1 },
        $push: { viewedBy: { user: req.user._id } }
      });
      material.viewCount += 1;
    }

    res.status(200).json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update material metadata
// @route   PUT /api/study-materials/:id
// @access  Faculty (owner) or Admin
const updateMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, error: 'Material not found' });

    if (req.user.role !== 'ADMIN' && material.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this material' });
    }

    const allowed = ['title', 'description', 'category', 'semester', 'academicYear', 'courseCode', 'tags', 'accessLevel', 'isPublished'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) material[field] = req.body[field];
    });

    if (req.body.tags && typeof req.body.tags === 'string') {
      material.tags = req.body.tags.split(',').map(t => t.trim());
    }

    await material.save();
    await material.populate([
      { path: 'subject', select: 'name subjectCode' },
      { path: 'department', select: 'name' },
      { path: 'faculty', select: 'name email' }
    ]);

    res.status(200).json({ success: true, data: material });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete material (and its files)
// @route   DELETE /api/study-materials/:id
// @access  Faculty (owner) or Admin
const deleteMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, error: 'Material not found' });

    if (req.user.role !== 'ADMIN' && material.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this material' });
    }

    material.files.forEach(f => fs.unlink(f.filepath, () => {}));
    await material.deleteOne();

    res.status(200).json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Download a file — tracks download count
// @route   GET /api/study-materials/:id/download/:filename
// @access  Authenticated
const downloadFile = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, error: 'Material not found' });

    const file = material.files.find(f => f.filename === req.params.filename);
    if (!file) return res.status(404).json({ success: false, error: 'File not found' });

    if (!fs.existsSync(file.filepath)) {
      return res.status(404).json({ success: false, error: 'File no longer exists on server' });
    }

    // Track download
    await StudyMaterial.findByIdAndUpdate(req.params.id, {
      $inc: { downloadCount: 1 },
      $push: { downloadedBy: { user: req.user._id } }
    });

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    res.sendFile(path.resolve(file.filepath));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Remove a specific file from a material
// @route   DELETE /api/study-materials/:id/files/:filename
// @access  Faculty (owner) or Admin
const removeFile = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, error: 'Material not found' });

    if (req.user.role !== 'ADMIN' && material.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const fileIdx = material.files.findIndex(f => f.filename === req.params.filename);
    if (fileIdx === -1) return res.status(404).json({ success: false, error: 'File not found' });

    fs.unlink(material.files[fileIdx].filepath, () => {});
    material.files.splice(fileIdx, 1);

    if (material.files.length === 0) {
      await material.deleteOne();
      return res.status(200).json({ success: true, message: 'Material deleted (no files remaining)' });
    }

    await material.save();
    res.status(200).json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add more files to existing material
// @route   POST /api/study-materials/:id/files
// @access  Faculty (owner) or Admin
const addFiles = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, error: 'Material not found' });

    if (req.user.role !== 'ADMIN' && material.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    const newFiles = req.files.map(f => ({
      originalName: f.originalname,
      filename: f.filename,
      filepath: f.path,
      mimetype: f.mimetype,
      size: f.size
    }));

    material.files.push(...newFiles);
    await material.save();

    res.status(200).json({ success: true, data: material });
  } catch (error) {
    if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get analytics for faculty's materials
// @route   GET /api/study-materials/analytics
// @access  Faculty, Admin
const getAnalytics = async (req, res) => {
  try {
    const filter = req.user.role === 'ADMIN' ? {} : { faculty: req.user._id };

    const [totals, byCategory, topViewed, topDownloaded, recentActivity] = await Promise.all([
      StudyMaterial.aggregate([
        { $match: filter },
        { $group: { _id: null, totalMaterials: { $sum: 1 }, totalViews: { $sum: '$viewCount' }, totalDownloads: { $sum: '$downloadCount' }, totalFiles: { $sum: { $size: '$files' } } } }
      ]),
      StudyMaterial.aggregate([
        { $match: filter },
        { $group: { _id: '$category', count: { $sum: 1 }, views: { $sum: '$viewCount' }, downloads: { $sum: '$downloadCount' } } },
        { $sort: { count: -1 } }
      ]),
      StudyMaterial.find(filter).sort({ viewCount: -1 }).limit(5).select('title viewCount downloadCount category subject').populate('subject', 'name'),
      StudyMaterial.find(filter).sort({ downloadCount: -1 }).limit(5).select('title viewCount downloadCount category subject').populate('subject', 'name'),
      StudyMaterial.find(filter).sort({ createdAt: -1 }).limit(10).select('title category createdAt viewCount downloadCount').lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: totals[0] || { totalMaterials: 0, totalViews: 0, totalDownloads: 0, totalFiles: 0 },
        byCategory,
        topViewed,
        topDownloaded,
        recentActivity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  uploadMaterials,
  getMaterials,
  getMaterial,
  updateMaterial,
  deleteMaterial,
  downloadFile,
  removeFile,
  addFiles,
  getAnalytics
};
