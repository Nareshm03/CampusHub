const Course = require('../models/Course');
const Student = require('../models/Student');

const createCourse = async (req, res, next) => {
  try {
    const course = await Course.create(req.body);
    const populated = await Course.findById(course._id)
      .populate('department', 'name')
      .populate('prerequisites', 'name code');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

const getCourses = async (req, res, next) => {
  try {
    const { department, semester } = req.query;
    const query = { isActive: true };
    if (department) query.department = department;
    if (semester) query.semester = Number(semester);

    const courses = await Course.find(query)
      .populate('department', 'name')
      .populate('prerequisites', 'name code')
      .sort({ semester: 1, name: 1 });

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

// @desc    Course catalogue with search
// @route   GET /api/courses/catalogue
// @access  Private
const getCourseCatalogue = async (req, res, next) => {
  try {
    const { search, department, semester, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (department) query.department = department;
    if (semester) query.semester = Number(semester);
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .populate('department', 'name')
      .populate('prerequisites', 'name code')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: courses,
      pagination: { total, page: Number(page), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('department', 'name')
      .populate('prerequisites', 'name code');
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

const enrollStudent = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const { courseId } = req.params;

    const [student, course] = await Promise.all([
      Student.findById(studentId),
      Course.findById(courseId)
    ]);

    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

    if (!student.courses) student.courses = [];
    if (!student.courses.includes(courseId)) {
      student.courses.push(courseId);
      await student.save();
    }

    res.status(200).json({ success: true, message: 'Student enrolled successfully' });
  } catch (error) {
    next(error);
  }
};

const registerCourses = async (req, res, next) => {
  try {
    const { courseIds } = req.body;
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) return res.status(404).json({ success: false, error: 'Student profile not found' });

    const courses = await Course.find({ _id: { $in: courseIds } });
    if (courses.length !== courseIds.length) {
      return res.status(400).json({ success: false, error: 'Some courses are invalid' });
    }

    for (const course of courses) {
      if (course.semester !== student.semester) {
        return res.status(400).json({ success: false, error: `Course ${course.code} is not available for your semester` });
      }
      if (course.prerequisites?.length > 0) {
        for (const preId of course.prerequisites) {
          if (!student.subjects.map(String).includes(String(preId))) {
            const pre = await Course.findById(preId).select('code');
            return res.status(400).json({ success: false, error: `Prerequisite not met: complete ${pre?.code || 'prerequisite'} first` });
          }
        }
      }
      if (course.enrolledCount >= course.maxSeats) {
        return res.status(400).json({ success: false, error: `Course ${course.code} is full (${course.maxSeats} seats max)` });
      }
    }

    student.subjects = [...new Set([...student.subjects.map(String), ...courseIds])];
    await student.save();
    await Course.updateMany({ _id: { $in: courseIds } }, { $inc: { enrolledCount: 1 } });

    res.status(200).json({ success: true, message: 'Courses registered successfully', data: { registeredCourses: courses.length } });
  } catch (error) {
    next(error);
  }
};

// @desc    Drop a course
// @route   DELETE /api/courses/:courseId/drop
// @access  Private/Student
const dropCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ success: false, error: 'Student profile not found' });

    const idx = student.subjects.map(String).indexOf(String(courseId));
    if (idx === -1) return res.status(400).json({ success: false, error: 'Not enrolled in this course' });

    student.subjects.splice(idx, 1);
    await student.save();
    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: -1 } });

    res.status(200).json({ success: true, message: 'Course dropped successfully' });
  } catch (error) {
    next(error);
  }
};

const getAvailableCourses = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ success: false, error: 'Student profile not found' });

    const courses = await Course.find({
      semester: student.semester,
      department: student.department,
      isActive: true,
      _id: { $nin: student.subjects }
    }).populate('department', 'name').populate('prerequisites', 'name code');

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourseCatalogue,
  getCourseById,
  enrollStudent,
  registerCourses,
  dropCourse,
  getAvailableCourses
};