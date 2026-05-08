const Alumni = require('../models/Alumni');
const Student = require('../models/Student');

const alumniController = {
  // Get all alumni
  getAlumni: async (req, res) => {
    try {
      const { graduationYear, company, page = 1, limit = 50 } = req.query;
      const filter = { isActive: true };
      
      if (graduationYear) filter.graduationYear = graduationYear;
      if (company) filter.currentCompany = new RegExp(company, 'i');
      
      const alumni = await Alumni.find(filter)
        .populate({
          path: 'studentId',
          populate: [
            { path: 'userId', select: 'name email' },
            { path: 'department', select: 'name code' }
          ]
        })
        .sort({ graduationYear: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
        
      const total = await Alumni.countDocuments(filter);
      
      res.json({
        success: true,
        data: alumni,
        pagination: { page: +page, limit: +limit, total }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Post job opportunity
  postJob: async (req, res) => {
    try {
      const { id } = req.params;
      const jobData = {
        ...req.body,
        postedAt: new Date()
      };
      
      const alumni = await Alumni.findByIdAndUpdate(
        id,
        { $push: { jobPostings: jobData } },
        { new: true }
      ).populate('studentId', 'name email');
      
      res.json({ success: true, data: alumni });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get job postings
  getJobPostings: async (req, res) => {
    try {
      const { location, company } = req.query;
      const alumni = await Alumni.find({ 'jobPostings.isActive': true })
        .populate({
          path: 'studentId',
          populate: [
            { path: 'userId', select: 'name email' },
            { path: 'department', select: 'name code' }
          ]
        });
      
      const jobs = [];
      alumni.forEach(alum => {
        alum.jobPostings.forEach(job => {
          if (job.isActive) {
            if (location && !job.location?.match(new RegExp(location, 'i'))) return;
            if (company && !job.company?.match(new RegExp(company, 'i'))) return;
            
            jobs.push({
              _id: job._id,
              job,
              postedBy: {
                name: alum.studentId?.userId?.name,
                company: alum.currentCompany,
                position: alum.currentPosition,
                email: alum.studentId?.userId?.email
              }
            });
          }
        });
      });
      
      jobs.sort((a, b) => new Date(b.job.postedAt) - new Date(a.job.postedAt));
      res.json({ success: true, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Offer mentorship
  offerMentorship: async (req, res) => {
    try {
      const { id } = req.params;
      const { mentorshipAreas } = req.body;
      
      const alumni = await Alumni.findByIdAndUpdate(
        id,
        { 
          mentorshipOffered: true,
          mentorshipAreas
        },
        { new: true }
      ).populate('studentId', 'name email');
      
      res.json({ success: true, data: alumni });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get mentors
  getMentors: async (req, res) => {
    try {
      const { area } = req.query;
      const filter = { mentorshipOffered: true, isActive: true };
      
      if (area) filter.mentorshipAreas = { $in: [area] };
      
      const mentors = await Alumni.find(filter)
        .populate({
          path: 'studentId',
          populate: [
            { path: 'userId', select: 'name email' },
            { path: 'department', select: 'name code' }
          ]
        })
        .select('studentId currentCompany currentPosition mentorshipAreas graduationYear');
        
      res.json({ success: true, data: mentors });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Request mentorship
  requestMentorship: async (req, res) => {
    try {
      const { mentorId } = req.params;
      const studentId = req.user.studentId;
      
      const alumni = await Alumni.findByIdAndUpdate(
        mentorId,
        { 
          $push: { 
            mentoringStudents: { 
              student: studentId,
              startDate: new Date()
            }
          }
        },
        { new: true }
      ).populate('mentoringStudents.student', 'name email usn');
      
      res.json({ success: true, data: alumni });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = alumniController;