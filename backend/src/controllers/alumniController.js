const Alumni = require('../models/Alumni');
const Student = require('../models/Student');
const mongoose = require('mongoose');

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

// Escape user input used in case-insensitive substring matches so crafted
// metacharacters can never throw or ReDoS (previously `new RegExp(q)`).
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePaging = (query) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_PAGE_SIZE;
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;
  return { page, limit };
};

// Explicit directory allowlist: identity + professional fields only.
// Account internals (passwords — never selected — flags, timestamps beyond
// graduationYear) are never serialized here.
const sanitizeAlumni = (doc) => {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const student = obj.studentId || null;
  const user = student?.userId || null;
  return {
    _id: obj._id,
    studentId: student
      ? {
          _id: student._id,
          usn: student.usn,
          userId: user ? { _id: user._id, name: user.name, email: user.email } : null,
          department: student.department || null
        }
      : null,
    graduationYear: obj.graduationYear,
    currentCompany: obj.currentCompany || '',
    currentPosition: obj.currentPosition || '',
    linkedinProfile: obj.linkedinProfile || '',
    mentorshipOffered: !!obj.mentorshipOffered,
    mentorshipAreas: obj.mentorshipAreas || []
  };
};

const populateDirectory = (query) => query.populate({
  path: 'studentId',
  populate: [
    { path: 'userId', select: 'name email' },
    { path: 'department', select: 'name code' }
  ]
});

// Owner of an alumni record = the User behind Alumni.studentId.userId.
// ADMIN bypasses. Server-derived only — client ids are never trusted.
const resolveOwnerId = (alumniDoc) => {
  const u = alumniDoc?.studentId?.userId;
  if (!u) return null;
  return String(u._id || u);
};

const requireOwnership = (req, alumniDoc) => {
  if (!alumniDoc) {
    return { status: 404, error: 'Alumni record not found' };
  }
  if (req.user.role === 'ADMIN') return { doc: alumniDoc };
  if (resolveOwnerId(alumniDoc) === String(req.user.id)) return { doc: alumniDoc };
  return { status: 403, error: 'You can only modify your own alumni record' };
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const alumniController = {
  // Get all alumni
  getAlumni: async (req, res) => {
    try {
      const { graduationYear, company, search } = req.query;
      const { page, limit } = parsePaging(req.query);
      const filter = { isActive: true };

      if (graduationYear) {
        const year = parseInt(graduationYear, 10);
        if (Number.isFinite(year)) filter.graduationYear = year;
      }
      if (company) filter.currentCompany = { $regex: escapeRegExp(company), $options: 'i' };

      // Name/USN substring search resolves through User/Student first so the
      // final query stays indexed and paginated (no in-memory fan-out).
      if (search) {
        const rx = { $regex: escapeRegExp(search), $options: 'i' };
        const [users, students] = await Promise.all([
          mongoose.model('User').find({ name: rx }).select('_id').limit(200),
          Student.find({ usn: rx }).select('_id').limit(200)
        ]);
        const studentIds = new Set(students.map((s) => String(s._id)));
        const byUser = await Student.find({ userId: { $in: users.map((u) => u._id) } }).select('_id').limit(200);
        byUser.forEach((s) => studentIds.add(String(s._id)));
        filter.studentId = { $in: [...studentIds] };
      }

      const [total, docs] = await Promise.all([
        Alumni.countDocuments(filter),
        populateDirectory(Alumni.find(filter))
          .sort({ graduationYear: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
      ]);

      // Orphan records (deleted Student/User) are excluded, never fabricated.
      const data = docs.map(sanitizeAlumni).filter((d) => d && d.studentId && d.studentId.userId);

      res.json({
        success: true,
        data,
        pagination: { page, limit, total }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Post job opportunity (owner or ADMIN; target must exist)
  postJob: async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid alumni ID format' });
      }
      const target = await Alumni.findById(id).populate({ path: 'studentId', populate: { path: 'userId', select: '_id' } });
      const gate = requireOwnership(req, target);
      if (gate.status) {
        return res.status(gate.status).json({ success: false, message: gate.error });
      }

      const { title, company, description, requirements, location, salary, contactEmail, applicationDeadline } = req.body || {};
      if (!title || typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
        return res.status(400).json({ success: false, message: 'Job title is required (max 120 characters)' });
      }
      if (!company || typeof company !== 'string' || !company.trim() || company.trim().length > 120) {
        return res.status(400).json({ success: false, message: 'Company is required (max 120 characters)' });
      }
      if (contactEmail !== undefined && contactEmail !== '' && !/^\S+@\S+\.\S+$/.test(String(contactEmail))) {
        return res.status(400).json({ success: false, message: 'contactEmail must be a valid email address' });
      }
      const str = (v, max) => (v === undefined || v === null ? undefined : String(v).slice(0, max));

      const updated = await Alumni.findByIdAndUpdate(
        id,
        {
          $push: {
            jobPostings: {
              title: title.trim(),
              company: company.trim(),
              description: str(description, 2000),
              requirements: str(requirements, 2000),
              location: str(location, 120),
              salary: str(salary, 120),
              contactEmail: contactEmail ? String(contactEmail).trim() : undefined,
              applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : undefined,
              isActive: true,
              postedAt: new Date()
            }
          }
        },
        { new: true }
      );
      const populated = await populateDirectory(Alumni.findById(updated._id));

      res.status(201).json({ success: true, data: sanitizeAlumni(populated) });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get job postings
  getJobPostings: async (req, res) => {
    try {
      const { location, company } = req.query;
      const alumni = await populateDirectory(
        Alumni.find({ 'jobPostings.isActive': true, isActive: true })
      );

      const locRx = location ? escapeRegExp(location) : null;
      const coRx = company ? escapeRegExp(company) : null;
      const jobs = [];
      alumni.forEach(alum => {
        if (!alum.studentId || !alum.studentId.userId) return; // skip orphans
        alum.jobPostings.forEach(job => {
          if (!job.isActive) return;
          if (locRx && !(job.location || '').match(new RegExp(locRx, 'i'))) return;
          if (coRx && !(job.company || '').match(new RegExp(coRx, 'i'))) return;

          jobs.push({
            _id: job._id,
            job: {
              title: job.title,
              company: job.company,
              description: job.description,
              location: job.location,
              salary: job.salary,
              contactEmail: job.contactEmail,
              applicationDeadline: job.applicationDeadline,
              postedAt: job.postedAt
            },
            postedBy: {
              name: alum.studentId.userId.name,
              company: alum.currentCompany,
              position: alum.currentPosition,
              email: alum.studentId.userId.email
            }
          });
        });
      });

      jobs.sort((a, b) => new Date(b.job.postedAt) - new Date(a.job.postedAt));
      res.json({ success: true, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Offer mentorship (owner or ADMIN; explicit opt-out supported)
  offerMentorship: async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid alumni ID format' });
      }
      const target = await Alumni.findById(id).populate({ path: 'studentId', populate: { path: 'userId', select: '_id' } });
      const gate = requireOwnership(req, target);
      if (gate.status) {
        return res.status(gate.status).json({ success: false, message: gate.error });
      }

      const { mentorshipOffered, mentorshipAreas } = req.body || {};
      if (mentorshipOffered === false) {
        const updated = await Alumni.findByIdAndUpdate(id, { mentorshipOffered: false, mentorshipAreas: [] }, { new: true });
        return res.json({ success: true, data: sanitizeAlumni(await populateDirectory(Alumni.findById(updated._id))) });
      }
      if (!Array.isArray(mentorshipAreas) || mentorshipAreas.length === 0 || mentorshipAreas.length > 10) {
        return res.status(400).json({ success: false, message: 'mentorshipAreas must be a non-empty array (max 10)' });
      }
      const areas = mentorshipAreas.map((a) => String(a).trim()).filter(Boolean).slice(0, 10);
      if (areas.length === 0) {
        return res.status(400).json({ success: false, message: 'mentorshipAreas must contain at least one value' });
      }

      const updated = await Alumni.findByIdAndUpdate(
        id,
        { mentorshipOffered: true, mentorshipAreas: areas },
        { new: true }
      );
      res.json({ success: true, data: sanitizeAlumni(await populateDirectory(Alumni.findById(updated._id))) });
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

      const mentors = await populateDirectory(Alumni.find(filter))
        .select('studentId currentCompany currentPosition mentorshipAreas graduationYear');

      const data = mentors
        .map(sanitizeAlumni)
        .filter((d) => d && d.studentId && d.studentId.userId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Request mentorship
  requestMentorship: async (req, res) => {
    try {
      const { mentorId } = req.params;
      if (!isValidId(mentorId)) {
        return res.status(400).json({ success: false, message: 'Invalid mentor ID format' });
      }

      // Resolve the real requester through Student.userId — never trust a
      // client-supplied or User-level studentId field.
      const requester = await Student.findOne({ userId: req.user.id }).select('_id');
      if (!requester) {
        return res.status(404).json({ success: false, message: 'A student profile is required to request mentorship' });
      }

      const mentor = await Alumni.findById(mentorId).populate({ path: 'studentId', populate: { path: 'userId', select: '_id name' } });
      if (!mentor || mentor.isActive === false) {
        return res.status(404).json({ success: false, message: 'Mentor not found' });
      }
      if (!mentor.mentorshipOffered) {
        return res.status(400).json({ success: false, message: 'This alumnus is not offering mentorship' });
      }
      const mentorUserId = mentor.studentId?.userId && String(mentor.studentId.userId._id || mentor.studentId.userId);
      if (mentorUserId === String(req.user.id)) {
        return res.status(400).json({ success: false, message: 'You cannot request mentorship from yourself' });
      }
      const duplicate = mentor.mentoringStudents.some(
        (entry) => String(entry.student) === String(requester._id) && entry.status !== 'completed'
      );
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'A mentorship request is already active with this mentor' });
      }

      mentor.mentoringStudents.push({ student: requester._id, startDate: new Date(), status: 'active' });
      await mentor.save();

      // Notify the mentor through the established notification channel
      // (record first — it is the source of truth; socket best-effort).
      // Duplicate-safe: retries hit the 409 above before reaching this.
      if (mentorUserId) {
        try {
          const Notification = require('../models/Notification');
          const notification = await Notification.create({
            recipient: mentorUserId,
            sender: req.user.id,
            title: 'New mentorship request',
            message: 'A student requested your mentorship. Review it in the alumni network.',
            type: 'INFO',
            priority: 'MEDIUM',
            data: { mentorId: String(mentor._id) }
          });
          try {
            const { getIO } = require('../config/socket');
            getIO().to(String(mentorUserId)).emit('new_notification', notification);
          } catch (_) {}
        } catch (_) {}
      }

      const refreshed = await Alumni.findById(mentor._id).populate({
        path: 'mentoringStudents.student',
        populate: { path: 'userId', select: 'name email' }
      });
      res.status(201).json({ success: true, data: sanitizeAlumni(await populateDirectory(Alumni.findById(mentor._id))), request: refreshed.mentoringStudents[refreshed.mentoringStudents.length - 1] });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = alumniController;
