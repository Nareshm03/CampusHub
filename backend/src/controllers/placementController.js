const JobPosting = require('../models/JobPosting');
const Company = require('../models/Company');
const User = require('../models/User');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
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

    // For students, scope to their own department/semester via their
    // Student profile (academic fields live on Student, not User).
    if (req.user.role === 'STUDENT') {
      const profile = await Student.findOne({ userId: req.user._id });
      if (profile) {
        query['eligibility.departments'] = { $in: [profile.department] };
        query['eligibility.semesters'] = { $in: [profile.semester] };
      }
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid job ID format' });
    }

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

    // Check if student has applied and eligibility (academic context
    // comes from the Student profile, not the User document)
    let userApplication = null;
    let eligibility = null;

    if (req.user.role === 'STUDENT') {
      userApplication = job.getStudentApplication(req.user._id);
      eligibility = job.isStudentEligible(await buildEligibilityContext(req.user));
    }

    // Remove other students' applications from response
    const jobData = job.toObject();
    if (req.user.role === 'STUDENT') {
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
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map((e) => e.message).join(', ')
      });
    }
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
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid job ID format' });
      }
      const job = await JobPosting.findById(id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Only published jobs accept applications
      if (job.status !== 'Published') {
        return res.status(400).json({
          success: false,
          message: 'Applications are closed for this job'
        });
      }

      // Check if already applied
      if (job.hasStudentApplied(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied for this job'
        });
      }

      // Check eligibility against the Student profile
      const eligibility = job.isStudentEligible(await buildEligibilityContext(req.user));
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid job ID format' });
    }

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid job ID format' });
    }
    const validStatuses = ['Pending', 'Shortlisted', 'Rejected', 'Interview Scheduled', 'Selected', 'Offer Extended', 'Offer Accepted', 'Offer Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid job ID format' });
    }

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

// Update job — only mutable posting fields are accepted. Ownership and
// system fields (company, postedBy, applications, views, timestamps) can
// never be altered through this endpoint.
const JOB_MUTABLE_FIELDS = [
  'title', 'description', 'jobType', 'duration', 'location', 'salary', 'ctc',
  'eligibility', 'requiredSkills', 'preferredSkills', 'qualifications',
  'experience', 'positions', 'responsibilities', 'benefits',
  'applicationDeadline', 'interviewProcess', 'documentsRequired', 'status',
  'notes'
];
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid job ID format' });
    }

    const updates = {};
    for (const field of JOB_MUTABLE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const job = await JobPosting.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
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
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map((e) => e.message).join(', ')
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating job',
      error: error.message
    });
  }
};

// Delete job — refused when applications exist, so applicant history can
// never disappear accidentally. Close/Cancel the posting instead (the
// status enum supports both); only application-free postings are deleted.
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid job ID format' });
    }

    const job = await JobPosting.findById(id).select('applications');
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    if (job.applications && job.applications.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete a job with ${job.applications.length} application(s). Close or Cancel the posting instead.`
      });
    }

    await JobPosting.findByIdAndDelete(id);

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

// ─── Readiness & skills (single /placements contract) ───────────────────────
// All readiness figures are computed live from real academic + profile data:
// CGPA (35%) from Marks rows, attendance (25%), assignment submissions (20%),
// skills/certifications/projects on the Student profile (20%).

// Resolve the Student profile for a User id.
const resolveStudentProfile = async (userId) => {
  return Student.findOne({ userId }).populate('department', 'name');
};

// Average percentage + 10-point CGPA from Marks rows (percentage / 9.5).
const computeAcademicScore = async (studentId) => {
  const rows = await Marks.find({ student: studentId });
  let ratioSum = 0;
  let counted = 0;
  rows.forEach((m) => {
    if (m.maxMarks > 0 && m.marks >= 0) {
      ratioSum += m.marks / m.maxMarks;
      counted += 1;
    }
  });
  if (counted === 0) return { cgpa: 0, percentage: 0, count: 0 };
  const percentage = (ratioSum / counted) * 100;
  return {
    cgpa: Math.round(Math.min(10, percentage / 9.5) * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
    count: counted
  };
};

// Eligibility context shaped like the profile fields isStudentEligible reads.
// Academic fields live on the Student profile, not the User document.
const buildEligibilityContext = async (user) => {
  const profile = await Student.findOne({ userId: user._id });
  const cgpa = profile ? (await computeAcademicScore(profile._id)).cgpa : 0;
  return {
    department: profile ? profile.department : user.department,
    semester: profile ? profile.semester : undefined,
    cgpa,
    backlogs: 0,
    graduationYear: profile ? profile.graduationYear : undefined
  };
};

const levelForScore = (total) => {
  if (total >= 85) return 'EXCELLENT';
  if (total >= 70) return 'HIGH';
  if (total >= 50) return 'MEDIUM';
  return 'LOW';
};

const computeReadiness = async (profile) => {
  const [academic, attendanceRows, assignments, submittedIds, publishedJobs] = await Promise.all([
    computeAcademicScore(profile._id),
    Attendance.find({ student: profile._id }).select('status'),
    Assignment.find({ department: profile.department, semester: profile.semester }).select('_id'),
    AssignmentSubmission.find({ student: profile._id }).distinct('assignment'),
    JobPosting.find({ status: 'Published' }).populate('company', 'name')
  ]);

  const cgpaScore = academic.count > 0 ? Math.round(academic.cgpa * 10) : 0;
  const present = attendanceRows.filter((a) => a.status === 'PRESENT').length;
  const attendancePct = attendanceRows.length > 0 ? Math.round((present / attendanceRows.length) * 100) : 0;

  const dueIds = assignments.map((a) => a._id.toString());
  const submittedSet = new Set((submittedIds || []).map((id) => id.toString()));
  const submitted = dueIds.filter((id) => submittedSet.has(id)).length;
  const homeworkPct = dueIds.length > 0 ? Math.round((submitted / dueIds.length) * 100) : 100;

  const skillCount =
    (profile.skills || []).length +
    (profile.certifications || []).length +
    (profile.projects || []).length;
  const skillsScore = Math.min(100, skillCount * 10);

  const totalScore = Math.round(
    cgpaScore * 0.35 + attendancePct * 0.25 + homeworkPct * 0.2 + skillsScore * 0.2
  );

  const ctx = {
    department: profile.department,
    semester: profile.semester,
    cgpa: academic.cgpa,
    backlogs: 0,
    graduationYear: profile.graduationYear
  };
  const eligibleCompanies = [
    ...new Set(
      publishedJobs
        .filter((job) => {
          try {
            return job.isStudentEligible(ctx).eligible;
          } catch (err) {
            return false;
          }
        })
        .map((job) => job.company && job.company.name)
        .filter(Boolean)
    )
  ];

  return {
    totalScore,
    level: levelForScore(totalScore),
    scores: {
      cgpa: { value: academic.count > 0 ? academic.cgpa : 'N/A', score: cgpaScore },
      attendance: { value: attendancePct, score: attendancePct },
      homework: { value: homeworkPct, score: homeworkPct },
      skills: { value: skillCount, score: skillsScore }
    },
    eligibleCompanies
  };
};

const sendOwnReadiness = async (req, res) => {
  try {
    const profile = await resolveStudentProfile(req.user._id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    res.json({ success: true, data: await computeReadiness(profile) });
  } catch (error) {
    console.error('Get readiness error:', error);
    res.status(500).json({ success: false, message: 'Error computing readiness', error: error.message });
  }
};

// GET /placements/readiness/me (Student: own readiness, computed live)
exports.getMyReadiness = sendOwnReadiness;

// POST /placements/readiness/me/calculate (Student: recompute live score)
exports.recalculateMyReadiness = sendOwnReadiness;

// GET /placements/readiness/student/:studentId (Faculty/Admin; :studentId is a Student _id)
exports.getStudentReadiness = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID format' });
    }
    const profile = await Student.findById(req.params.studentId).populate('department', 'name');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    res.json({ success: true, data: await computeReadiness(profile) });
  } catch (error) {
    console.error('Get student readiness error:', error);
    res.status(500).json({ success: false, message: 'Error computing readiness', error: error.message });
  }
};

const shapeSkills = (profile) => ({
  skills: profile.skills || [],
  certifications: profile.certifications || [],
  projects: profile.projects || []
});

// GET /placements/skills/me (Student: own skills profile)
exports.getMySkills = async (req, res) => {
  try {
    const profile = await resolveStudentProfile(req.user._id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    res.json({ success: true, data: shapeSkills(profile) });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ success: false, message: 'Error fetching skills', error: error.message });
  }
};

// PUT /placements/skills/me (Student: replace own skills profile)
exports.updateMySkills = async (req, res) => {
  try {
    const profile = await resolveStudentProfile(req.user._id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    const { skills = [], certifications = [], projects = [] } = req.body || {};
    if (!Array.isArray(skills) || !Array.isArray(certifications) || !Array.isArray(projects)) {
      return res.status(400).json({ success: false, message: 'skills, certifications and projects must be arrays' });
    }
    profile.skills = skills.filter((s) => typeof s === 'string').map((s) => s.trim()).filter(Boolean).slice(0, 100);
    profile.certifications = certifications
      .filter((c) => c && typeof c.name === 'string' && typeof c.issuer === 'string')
      .map((c) => ({ name: c.name.trim(), issuer: c.issuer.trim(), date: typeof c.date === 'string' ? c.date : '' }))
      .slice(0, 50);
    profile.projects = projects
      .filter((p) => p && typeof p.name === 'string')
      .map((p) => ({
        name: p.name.trim(),
        tech: Array.isArray(p.tech) ? p.tech.filter((t) => typeof t === 'string').map((t) => t.trim()).filter(Boolean).slice(0, 20) : [],
        description: typeof p.description === 'string' ? p.description : ''
      }))
      .slice(0, 50);
    await profile.save();
    res.json({ success: true, message: 'Skills updated successfully', data: shapeSkills(profile) });
  } catch (error) {
    console.error('Update skills error:', error);
    res.status(500).json({ success: false, message: 'Error updating skills', error: error.message });
  }
};

// GET /placements/skills/student/:studentId (Faculty/Admin; :studentId is a Student _id)
exports.getStudentSkills = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID format' });
    }
    const profile = await Student.findById(req.params.studentId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    res.json({ success: true, data: shapeSkills(profile) });
  } catch (error) {
    console.error('Get student skills error:', error);
    res.status(500).json({ success: false, message: 'Error fetching skills', error: error.message });
  }
};
