const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const placementController = require('../controllers/placementController');
const companyController = require('../controllers/companyController');

// Job Posting Routes

// Public/Student routes
router.get('/jobs', protect, placementController.getAllJobs);
router.get('/jobs/:id', protect, placementController.getJobById);
router.get('/my-applications', protect, authorize('STUDENT'), placementController.getMyApplications);
router.post('/jobs/:id/apply', protect, authorize('STUDENT'), placementController.applyForJob);

// Faculty/Admin routes
router.post('/jobs', protect, authorize('FACULTY', 'ADMIN'), placementController.createJob);
router.put('/jobs/:id', protect, authorize('FACULTY', 'ADMIN'), placementController.updateJob);
router.delete('/jobs/:id', protect, authorize('ADMIN'), placementController.deleteJob);

// Application Management
router.get('/jobs/:id/applications', protect, authorize('FACULTY', 'ADMIN'), placementController.getJobApplications);
router.put('/jobs/:id/applications/:studentId/status', protect, authorize('FACULTY', 'ADMIN'), placementController.updateApplicationStatus);
router.post('/jobs/:id/applications/:studentId/interview', protect, authorize('FACULTY', 'ADMIN'), placementController.scheduleInterview);

// Statistics
router.get('/statistics', protect, placementController.getPlacementStatistics);

// Readiness (computed live from academic + profile data — single contract)
router.get('/readiness/me', protect, authorize('STUDENT'), placementController.getMyReadiness);
router.post('/readiness/me/calculate', protect, authorize('STUDENT'), placementController.recalculateMyReadiness);
router.get('/readiness/student/:studentId', protect, authorize('FACULTY', 'ADMIN'), placementController.getStudentReadiness);

// Skills & profile (stored on the Student profile — single contract)
router.get('/skills/me', protect, authorize('STUDENT'), placementController.getMySkills);
router.put('/skills/me', protect, authorize('STUDENT'), placementController.updateMySkills);
router.get('/skills/student/:studentId', protect, authorize('FACULTY', 'ADMIN'), placementController.getStudentSkills);

// Company Routes

// Public routes
router.get('/companies', protect, companyController.getAllCompanies);
router.get('/companies/:id', protect, companyController.getCompanyById);

// Admin/Faculty routes
router.post('/companies', protect, authorize('FACULTY', 'ADMIN'), companyController.createCompany);
router.put('/companies/:id', protect, authorize('FACULTY', 'ADMIN'), companyController.updateCompany);
router.delete('/companies/:id', protect, authorize('ADMIN'), companyController.deleteCompany);
router.post('/companies/:id/campus-visit', protect, authorize('FACULTY', 'ADMIN'), companyController.addCampusVisit);

module.exports = router;
