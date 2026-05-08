const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const placementController = require('../controllers/placementController');
const companyController = require('../controllers/companyController');

// Job Posting Routes

// Public/Student routes
router.get('/jobs', protect, placementController.getAllJobs);
router.get('/jobs/:id', protect, placementController.getJobById);
router.get('/my-applications', protect, authorize('student'), placementController.getMyApplications);
router.post('/jobs/:id/apply', protect, authorize('student'), placementController.applyForJob);

// Faculty/Admin routes
router.post('/jobs', protect, authorize('faculty', 'admin'), placementController.createJob);
router.put('/jobs/:id', protect, authorize('faculty', 'admin'), placementController.updateJob);
router.delete('/jobs/:id', protect, authorize('admin'), placementController.deleteJob);

// Application Management
router.get('/jobs/:id/applications', protect, authorize('faculty', 'admin'), placementController.getJobApplications);
router.put('/jobs/:id/applications/:studentId/status', protect, authorize('faculty', 'admin'), placementController.updateApplicationStatus);
router.post('/jobs/:id/applications/:studentId/interview', protect, authorize('faculty', 'admin'), placementController.scheduleInterview);

// Statistics
router.get('/statistics', protect, placementController.getPlacementStatistics);

// Company Routes

// Public routes
router.get('/companies', protect, companyController.getAllCompanies);
router.get('/companies/:id', protect, companyController.getCompanyById);

// Admin/Faculty routes
router.post('/companies', protect, authorize('faculty', 'admin'), companyController.createCompany);
router.put('/companies/:id', protect, authorize('faculty', 'admin'), companyController.updateCompany);
router.delete('/companies/:id', protect, authorize('admin'), companyController.deleteCompany);
router.post('/companies/:id/campus-visit', protect, authorize('faculty', 'admin'), companyController.addCampusVisit);

module.exports = router;
