const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  filepath: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const studyMaterialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    enum: ['LECTURE_NOTES', 'RESEARCH_PAPER', 'SYLLABUS', 'ASSIGNMENT', 'REFERENCE', 'OTHER'],
    required: true,
    index: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
    index: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8,
    index: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  courseCode: {
    type: String,
    trim: true,
    uppercase: true,
    index: true
  },
  tags: [{ type: String, trim: true, lowercase: true }],
  files: [fileSchema],
  accessLevel: {
    type: String,
    enum: ['ALL_STUDENTS', 'DEPARTMENT_ONLY', 'FACULTY_ONLY'],
    default: 'ALL_STUDENTS'
  },
  isPublished: {
    type: Boolean,
    default: true,
    index: true
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  viewedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now }
  }],
  downloadedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    downloadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

studyMaterialSchema.index({ title: 'text', description: 'text', tags: 'text' });
studyMaterialSchema.index({ faculty: 1, isPublished: 1 });
studyMaterialSchema.index({ department: 1, semester: 1, isPublished: 1 });
studyMaterialSchema.index({ subject: 1, category: 1 });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
