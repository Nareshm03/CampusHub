const Ticket = require('../models/Ticket');

const ticketController = {
  // Create new ticket (any authenticated user; privileged fields are
  // server-assigned and cannot be set by the client)
  createTicket: async (req, res) => {
    try {
      const { title, description, category, priority } = req.body;
      const ticket = new Ticket({
        title,
        description,
        category,
        priority,
        submittedBy: req.user.id
      });
      await ticket.save();
      await ticket.populate('submittedBy', 'name email');
      res.status(201).json({ success: true, data: ticket });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get all tickets (ADMIN management view)
  getTickets: async (req, res) => {
    try {
      const { status, category, priority, page = 1, limit = 10 } = req.query;
      const filter = {};
      
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      
      const tickets = await Ticket.find(filter)
        .populate('submittedBy assignedTo', 'name email')
        .populate('comments.user', 'name')
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

  // Get user's tickets (owner-scoped)
  getMyTickets: async (req, res) => {
    try {
      const tickets = await Ticket.find({ submittedBy: req.user.id })
        .populate('assignedTo', 'name email')
        .populate('comments.user', 'name')
        .sort({ createdAt: -1 });
      res.json({ success: true, data: tickets });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update ticket status (ADMIN any ticket; others only their own, no assignment)
  updateTicket: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, assignedTo, response } = req.body;

      const existing = await Ticket.findById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Ticket not found' });

      const isAdmin = req.user.role === 'ADMIN';
      if (!isAdmin && existing.submittedBy.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this ticket' });
      }
      if (assignedTo && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Only admins can assign tickets' });
      }

      const updates = {};
      if (status !== undefined) updates.status = status;
      if (response) updates.resolution = response;
      if (assignedTo) updates.assignedTo = assignedTo;
      if (updates.status === 'resolved') updates.resolvedAt = new Date();

      const ticket = await Ticket.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
        .populate('submittedBy assignedTo', 'name email')
        .populate('comments.user', 'name');

      res.json({ success: true, data: ticket });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Add comment to ticket (ADMIN any ticket; others only their own)
  addComment: async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;

      if (!message || !String(message).trim()) {
        return res.status(400).json({ success: false, message: 'Comment message is required' });
      }

      const existing = await Ticket.findById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Ticket not found' });

      if (req.user.role !== 'ADMIN' && existing.submittedBy.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to comment on this ticket' });
      }

      existing.comments.push({ user: req.user.id, message: String(message).trim() });
      await existing.save();
      await existing.populate('comments.user submittedBy assignedTo', 'name email');
      
      res.json({ success: true, data: existing });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = ticketController;