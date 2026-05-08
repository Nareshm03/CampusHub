const AcademicCalendar = require('../models/AcademicCalendar');

/**
 * @desc    Get all academic calendars
 * @route   GET /api/v1/calendar
 * @access  Private
 */
exports.getCalendars = async (req, res, next) => {
  try {
    const { academicYear, semester } = req.query;

    const query = {};
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);

    const calendars = await AcademicCalendar.find(query)
      .sort({ academicYear: -1, semester: -1 });

    res.status(200).json({ success: true, message: 'Academic calendars retrieved successfully', data: calendars });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current academic calendar
 * @route   GET /api/v1/calendar/current
 * @access  Private
 */
exports.getCurrentCalendar = async (req, res, next) => {
  try {
    const now = new Date();

    let calendar = await AcademicCalendar.findOne({
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).sort({ createdAt: -1 });

    if (!calendar) {
      // If no current calendar found, try to get the most recent one
      calendar = await AcademicCalendar.findOne().sort({ endDate: -1 });
      
      if (!calendar) {
        // Create a default calendar if none exists
        const currentYear = now.getFullYear();
        const nextYear = currentYear + 1;
        const startDate = new Date(currentYear, 0, 1); // January 1st current year
        const endDate = new Date(currentYear, 11, 31); // December 31st current year
        
        calendar = await AcademicCalendar.create({
          academicYear: `${currentYear}-${nextYear.toString().slice(-2)}`,
          semester: 1,
          startDate,
          endDate,
          events: [
            {
              title: 'Academic Year Begins',
              description: 'Start of the new academic year',
              startDate: new Date(currentYear, 0, 15),
              type: 'OTHER'
            }
          ]
        });
      }
    }

    res.status(200).json({ success: true, message: 'Current calendar retrieved successfully', data: calendar });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get calendar by ID
 * @route   GET /api/v1/calendar/:id
 * @access  Private
 */
exports.getCalendarById = async (req, res, next) => {
  try {
    const calendar = await AcademicCalendar.findById(req.params.id);

    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Calendar not found' });
    }

    res.status(200).json({ success: true, message: 'Calendar retrieved successfully', data: calendar });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get upcoming events
 * @route   GET /api/v1/calendar/events/upcoming
 * @access  Private
 */
exports.getUpcomingEvents = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const calendars = await AcademicCalendar.find({
      $or: [
        { startDate: { $lte: futureDate }, endDate: { $gte: now } },
        { 'events.startDate': { $gte: now, $lte: futureDate } }
      ]
    });

    // Extract and flatten all upcoming events
    const upcomingEvents = [];

    calendars.forEach(calendar => {
      calendar.events.forEach(event => {
        if (event.startDate >= now && event.startDate <= futureDate) {
          upcomingEvents.push({
            ...event.toObject(),
            academicYear: calendar.academicYear,
            semester: calendar.semester
          });
        }
      });

      // Add exam schedules
      if (calendar.examSchedule) {
        ['internal1', 'internal2', 'final'].forEach(examType => {
          const exam = calendar.examSchedule[examType];
          if (exam && exam.startDate >= now && exam.startDate <= futureDate) {
            upcomingEvents.push({
              title: `${examType.charAt(0).toUpperCase() + examType.slice(1)} Exam`,
              startDate: exam.startDate,
              endDate: exam.endDate,
              type: 'EXAM',
              academicYear: calendar.academicYear,
              semester: calendar.semester
            });
          }
        });
      }
    });

    // Sort by date
    upcomingEvents.sort((a, b) => a.startDate - b.startDate);

    res.status(200).json({ success: true, message: 'Upcoming events retrieved successfully', data: upcomingEvents });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get events by type
 * @route   GET /api/v1/calendar/events/type/:type
 * @access  Private
 */
exports.getEventsByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const validTypes = ['EXAM', 'HOLIDAY', 'REGISTRATION', 'ORIENTATION', 'OTHER'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid event type' });
    }

    const calendars = await AcademicCalendar.find({
      'events.type': type
    });

    const events = [];
    calendars.forEach(calendar => {
      calendar.events.forEach(event => {
        if (event.type === type) {
          events.push({
            ...event.toObject(),
            academicYear: calendar.academicYear,
            semester: calendar.semester
          });
        }
      });
    });

    res.success(events, `${type} events retrieved successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create academic calendar
 * @route   POST /api/v1/calendar
 * @access  Private/Admin
 */
exports.createCalendar = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const calendar = await AcademicCalendar.create(req.body);

    res.status(201).json({ success: true, message: 'Calendar created successfully', data: calendar });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update academic calendar
 * @route   PUT /api/v1/calendar/:id
 * @access  Private/Admin
 */
exports.updateCalendar = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const calendar = await AcademicCalendar.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Calendar not found' });
    }

    res.status(200).json({ success: true, message: 'Calendar updated successfully', data: calendar });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add event to calendar
 * @route   POST /api/v1/calendar/:id/events
 * @access  Private/Admin
 */
exports.addEvent = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FACULTY') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const calendar = await AcademicCalendar.findById(req.params.id);

    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Calendar not found' });
    }

    calendar.events.push(req.body);
    await calendar.save();

    res.status(201).json({ success: true, message: 'Event added successfully', data: calendar });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update event
 * @route   PUT /api/v1/calendar/:id/events/:eventId
 * @access  Private/Admin
 */
exports.updateEvent = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FACULTY') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const calendar = await AcademicCalendar.findById(req.params.id);

    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Calendar not found' });
    }

    const event = calendar.events.id(req.params.eventId);

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    Object.assign(event, req.body);
    await calendar.save();

    res.status(200).json({ success: true, message: 'Event updated successfully', data: calendar });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete event
 * @route   DELETE /api/v1/calendar/:id/events/:eventId
 * @access  Private/Admin
 */
exports.deleteEvent = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FACULTY') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const calendar = await AcademicCalendar.findById(req.params.id);

    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Calendar not found' });
    }

    const event = calendar.events.id(req.params.eventId);

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    event.deleteOne();
    await calendar.save();

    res.status(200).json({ success: true, message: 'Event deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete calendar
 * @route   DELETE /api/v1/calendar/:id
 * @access  Private/Admin
 */
exports.deleteCalendar = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const calendar = await AcademicCalendar.findById(req.params.id);

    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Calendar not found' });
    }

    await calendar.deleteOne();

    res.status(200).json({ success: true, message: 'Calendar deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
};

