const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private/Admin/Faculty
const createNotification = async (req, res, next) => {
  try {
    const { recipients, title, message, type, priority, data } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required'
      });
    }

    const notifications = [];
    
    for (const recipientId of recipients) {
      const notification = await Notification.create({
        recipient: recipientId,
        sender: req.user.id,
        title,
        message,
        type: type || 'INFO',
        priority: priority || 'MEDIUM',
        data
      });
      notifications.push(notification);
    }

    res.status(201).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my notifications
// @route   GET /api/notifications/my
// @access  Private
const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    let query = { recipient: req.user.id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      data: notifications,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    next(error);
  }
};

// Utility function to send notification to users
const sendNotification = async (recipients, title, message, type = 'INFO', priority = 'MEDIUM', data = null, senderId = null) => {
  try {
    const { getIO } = require('../config/socket');
    const notifications = [];
    
    for (const recipientId of recipients) {
      const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        title,
        message,
        type,
        priority,
        data
      });
      notifications.push(notification);

      try {
        getIO().to(recipientId.toString()).emit('new_notification', notification);
      } catch (_) {}
    }
    
    return notifications;
  } catch (error) {
    console.error('Error sending notification:', error);
    return [];
  }
};

// Send notification to all users of a specific role
const sendNotificationToRole = async (role, title, message, type = 'INFO', priority = 'MEDIUM', data = null, senderId = null) => {
  try {
    const users = await User.find({ role }).select('_id');
    const recipients = users.map(user => user._id);
    return await sendNotification(recipients, title, message, type, priority, data, senderId);
  } catch (error) {
    console.error('Error sending notification to role:', error);
    return [];
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendNotification,
  sendNotificationToRole
};