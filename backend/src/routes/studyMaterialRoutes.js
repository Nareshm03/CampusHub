const express = require('express');
const router = express.Router();
const { authenticateToken, adminOrFaculty, authorize } = require('../middleware/auth');
const studyMaterialUpload = require('../utils/studyMaterialUpload');
const {
  uploadMaterials,
  getMaterials,
  getMaterial,
  updateMaterial,
  deleteMaterial,
  downloadFile,
  removeFile,
  addFiles,
  getAnalytics
} = require('../controllers/studyMaterialController');

// All routes require authentication
router.use(authenticateToken);

// Analytics — faculty/admin only
router.get('/analytics', adminOrFaculty, getAnalytics);

// List & upload
router.get('/', getMaterials);
router.post('/', adminOrFaculty, studyMaterialUpload.array('files', 10), uploadMaterials);

// Single material
router.get('/:id', getMaterial);
router.put('/:id', adminOrFaculty, updateMaterial);
router.delete('/:id', adminOrFaculty, deleteMaterial);

// File management
router.get('/:id/download/:filename', downloadFile);
router.post('/:id/files', adminOrFaculty, studyMaterialUpload.array('files', 10), addFiles);
router.delete('/:id/files/:filename', adminOrFaculty, removeFile);

module.exports = router;
