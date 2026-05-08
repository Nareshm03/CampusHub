const JobPosting = require('../models/JobPosting');
const Company = require('../models/Company');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AuditLogger = require('../utils/auditLogger');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/placement-documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all job postings
exports.getAllJobs = async (req, res) => {
  try {
    const {
      status,
      jobType,
      company,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filters
    if (status) query.status = status;
    else query.status = 'Published'; // Default to published jobs

    if (jobType) query.jobType = jobType;
    if (company) query.company = company;
    
    if (search) {
      query.$text = { $search: search };
    }

    // For students, filter by eligibility
    if (req.user.role === 'student') {
      query['eligibility.departments'] = { $in: [req.user.department] };
      query['eligibility.semesters'] = { $in: [req.user.semester] };
      query.applicationDeadline = { $gte: new Date() };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const jobs = await JobPosting.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('company', 'name logo industry companySize')
      .populate('eligibility.departments', 'name')
      .populate('postedBy', 'name')
      .select('-applications');

    const total = await JobPosting.countDocuments(query);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message
    });
  }
};

// Get job by ID
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await JobPosting.findById(id)
      .populate('company')
      .populate('eligibility.departments', 'name')
      .populate('postedBy', 'name email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Increment view count
    job.incrementViews();
    await job.save();

    // Check if student has applied and eligibility
    let userApplication = null;
    let eligibility = null;

    if (req.user.role === 'student') {
      userApplication = job.getStudentApplication(req.user._id);
      eligibility = job.isStudentEligible(req.user);
    }

    // Remove other students' applications from response
    const jobData = job.toObject();
    if (req.user.role === 'student') {
      delete jobData.applications;
    }

    res.json({
      success: true,
      data: {
        job: jobData,
        userApplication,
        eligibility
      }
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job',
      error: error.message
    });
  }
};

// Create job posting (Admin/Faculty)
exports.createJob = async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      postedBy: req.user._id,
      status: req.body.status || 'Draft'
    };

    const job = new JobPosting(jobData);
    await job.save();

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating job',
      error: error.message
    });
  }
};

// Apply for job
exports.applyForJob = [
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 },
    { name: 'documents', maxCount: 5 }
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const job = await JobPosting.findById(id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Check if already applied
      if (job.hasStudentApplied(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied for this job'
        });
      }

      // Check eligibility
      const eligibility = job.isStudentEligible(req.user);
      if (!eligibility.eligible) {
        return res.status(403).json({
          success: false,
          message: eligibility.reason
        });
      }

      // Check deadline
      if (new Date() > job.applicationDeadline) {
        return res.status(400).json({
          success: false,
          message: 'Application deadline has passed'
        });
      }

      const application = {
        student: req.user._id,
        appliedAt: new Date(),
        status: 'Pending'
      };

      // Add uploaded files
      if (req.files) {
        if (req.files.resume) {
          application.resume = `/uploads/placement-documents/${req.files.resume[0].filename}`;
        }
        if (req.files.coverLetter) {
          application.coverLetter = `/uploads/placement-documents/${req.files.coverLetter[0].filename}`;
        }
        if (req.files.documents) {
          application.documents = req.files.documents.map(file => ({
            name: file.originalname,
            url: `/uploads/placement-documents/${file.filename}`
          }));
        }
      }

      job.addApplication(application);
      await job.save();

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: application
      });
    } catch (error) {
      console.error('Apply for job error:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting application',
        error: error.message
      });
    }
  }
];

// Get my applications (Student)
exports.getMyApplications = async (req, res) => {
  try {
    const jobs = await JobPosting.find({
      'applications.student': req.user._id
    })
      .populate('company', 'name logo')
      .populate('eligibility.departments', 'name');

    const applications = jobs.map(job => {
      const application = job.getStudentApplication(req.user._id);
      return {
        jobId: job._id,
        jobTitle: job.title,
        company: job.company,
        jobType: job.jobType,
        location: job.location,
        salary: job.salary,
        application
      };
    });

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// Get job applications (Admin/Faculty)
exports.getJobApplications = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const job = await JobPosting.findById(id)
      .populate('company', 'name logo')
      .populate({
        path: 'applications.student',
        select: 'name email rollNumber semester department cgpa'
      });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    let applications = job.applications;
    
    if (status) {
      applications = applications.filter(app => app.status === status);
    }

    res.json({
      success: true,
      data: {
        job: {
          title: job.title,
          company: job.company,
          positions: job.positions
        },
        applications,
        statistics: {
          total: job.applications.length,
          pending: job.applications.filter(app => app.status === 'Pending').length,
          shortlisted: job.applications.filter(app => app.status === 'Shortlisted').length,
          selected: job.applications.filter(app => app.status === 'Selected').length,
          rejected: job.applications.filter(app => app.status === 'Rejected').length
        }
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// Update application status (Admin/Faculty)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const { status, notes, offerDetails } = req.body;

    const job = await JobPosting.findById(id).populate('company', 'name');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Get application before update for audit trail
    const beforeApplication = job.applications.find(
      app => app.student.toString() === studentId
    );
    const beforeStatus = beforeApplication ? beforeApplication.status : null;

    const application = job.updateApplicationStatus(studentId, status, {
      notes,
      offerDetails
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await job.save();
    
    // Audit log for placement status change
    await AuditLogger.logPlacementAction('PLACEMENT_STATUS_CHANGED', req.user, {
      entityId: job._id,
      affectedUser: studentId,
      changes: {
        before: { status: beforeStatus },
        after: { status, notes, offerDetails }
      },
      metadata: {
        jobTitle: job.title,
        companyName: job.company?.name,
        previousStatus: beforeStatus
      },
      req
    });
    
    // Special audit for offer made
    if (status === 'Offered' && offerDetails) {
      await AuditLogger.logPlacementAction('PLACEMENT_OFFER_MADE', req.user, {
        entityId: job._id,
        affectedUser: studentId,
        changes: {
          after: { offerDetails }
        },
        metadata: {
          jobTitle: job.title,
          companyName: job.company?.name,
          package: offerDetails.package
        },
        req
      });
    }

    res.json({
      success: true,
      message: 'Application status updated',
      data: application
    });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application',
      error: error.message
    });
  }
};

// Schedule interview
exports.scheduleInterview = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const interviewData = req.body;

    const job = await JobPosting.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const application = job.scheduleInterview(studentId, interviewData);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await job.save();

    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      data: application
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling interview',
      error: error.message
    });
  }
};

// Get placement statistics
exports.getPlacementStatistics = async (req, res) => {
  try {
    const { year, department } = req.query;

    const query = {
      status: { $in: ['Published', 'Closed'] }
    };

    if (department) {
      query['eligibility.departments'] = department;
    }

    const jobs = await JobPosting.find(query)
      .populate('company', 'name industry');

    const statistics = {
      totalJobs: jobs.length,
      totalApplications: 0,
      totalOffers: 0,
      totalPlacements: 0,
      averagePackage: 0,
      highestPackage: 0,
      companyWise: {},
      departmentWise: {},
      jobTypeWise: {
        'Full-time': 0,
        'Internship': 0
      }
    };

    let totalPackageSum = 0;
    let placedStudents = new Set();

    jobs.forEach(job => {
      statistics.totalApplications += job.applications.length;
      
      const offers = job.applications.filter(app => app.status === 'Offer Extended' || app.status === 'Offer Accepted');
      const placements = job.applications.filter(app => app.status === 'Offer Accepted');
      
      statistics.totalOffers += offers.length;
      statistics.totalPlacements += placements.length;

      // Track unique placed students
      placements.forEach(app => placedStudents.add(app.student.toString()));

      // Calculate packages
      placements.forEach(app => {
        if (app.offerDetails?.ctc) {
          totalPackageSum += app.offerDetails.ctc;
          if (app.offerDetails.ctc > statistics.highestPackage) {
            statistics.highestPackage = app.offerDetails.ctc;
          }
        }
      });

      // Company wise
      const companyName = job.company.name;
      if (!statistics.companyWise[companyName]) {
        statistics.companyWise[companyName] = {
          applications: 0,
          placements: 0
        };
      }
      statistics.companyWise[companyName].applications += job.applications.length;
      statistics.companyWise[companyName].placements += placements.length;

      // Job type wise
      if (statistics.jobTypeWise[job.jobType] !== undefined) {
        statistics.jobTypeWise[job.jobType] += placements.length;
      }
    });

    statistics.uniqueStudentsPlaced = placedStudents.size;
    statistics.averagePackage = statistics.totalPlacements > 0 
      ? totalPackageSum / statistics.totalPlacements 
      : 0;

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// Update job
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const job = await JobPosting.findByIdAndUpdate(id, updates, { new: true })
      .populate('company', 'name logo');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating job',
      error: error.message
    });
  }
};

// Delete job
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await JobPosting.findByIdAndDelete(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting job',
      error: error.message
    });
  }
};
