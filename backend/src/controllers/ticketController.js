const Ticket = require('../models/Ticket');

const ticketController = {
  // Create new ticket
  createTicket: async (req, res) => {
    try {
      const ticket = new Ticket({
        ...req.body,
        submittedBy: req.user.id
      });
      await ticket.save();
      await ticket.populate('submittedBy', 'name email');
      res.status(201).json({ success: true, data: ticket });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get all tickets (with filters)
  getTickets: async (req, res) => {
    try {
      const { status, category, priority, page = 1, limit = 10 } = req.query;
      const filter = {};
      
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      
      const tickets = await Ticket.find(filter)
        .populate('submittedBy assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
        
      const total = await Ticket.countDocuments(filter);
      
      res.json({
        success: true,
        data: tickets,
        pagination: { page: +page, limit: +limit, total }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get user's tickets
  getMyTickets: async (req, res) => {
    try {
      const tickets = await Ticket.find({ submittedBy: req.user.id })
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });
      res.json({ success: true, data: tickets });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update ticket status
  updateTicket: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, assignedTo, response } = req.body;

      const updates = { status };
      if (response) updates.resolution = response;
      if (assignedTo) updates.assignedTo = assignedTo;
      if (status === 'resolved') updates.resolvedAt = new Date();

      const ticket = await Ticket.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
        .populate('submittedBy assignedTo', 'name email');

      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

      res.json({ success: true, data: ticket });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Add comment to ticket
  addComment: async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      
      const ticket = await Ticket.findByIdAndUpdate(
        id,
        { $push: { comments: { user: req.user.id, message } } },
        { new: true }
      ).populate('comments.user submittedBy assignedTo', 'name email');
      
      res.json({ success: true, data: ticket });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = ticketController;