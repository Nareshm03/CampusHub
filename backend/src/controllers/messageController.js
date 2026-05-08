const Message = require('../models/Message');
const User = require('../models/User');

/**
 * @desc    Get conversation history between two users
 * @route   GET /api/v1/messages/:userId
 * @access  Private
 */
exports.getConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversationId = Message.getConversationId(req.user.id, userId);

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('sender', 'name email role profilePicture')
      .populate('receiver', 'name email role profilePicture');

    const total = await Message.countDocuments({ conversation: conversationId });

    res.success(
      {
        messages: messages.reverse(), // Reverse to show oldest first
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total
      },
      'Conversation retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all conversations for current user
 * @route   GET /api/v1/messages/conversations
 * @access  Private
 */
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all unique conversations
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversation',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$isRead', false] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Populate user details
    await Message.populate(messages, {
      path: 'lastMessage.sender lastMessage.receiver',
      select: 'name email role profilePicture'
    });

    // Format response to include other user details
    const conversations = messages.map(conv => {
      const isCurrentUserSender = conv.lastMessage.sender._id.toString() === userId.toString();
      const otherUser = isCurrentUserSender ? conv.lastMessage.receiver : conv.lastMessage.sender;

      return {
        conversationId: conv._id,
        otherUser,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount
      };
    });

    res.success(conversations, 'Conversations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark messages as read
 * @route   PUT /api/v1/messages/:userId/read
 * @access  Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const conversationId = Message.getConversationId(req.user.id, userId);

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.success(null, 'Messages marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send a message (used for HTTP fallback)
 * @route   POST /api/v1/messages/:userId
 * @access  Private
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { content, type = 'text' } = req.body;

    // Validate receiver exists
    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: 'Receiver not found'
      });
    }

    const conversationId = Message.getConversationId(req.user.id, userId);

    const message = await Message.create({
      sender: req.user.id,
      receiver: userId,
      content,
      type,
      conversation: conversationId
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email role profilePicture')
      .populate('receiver', 'name email role profilePicture');

    res.success(populatedMessage, 'Message sent successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a message
 * @route   DELETE /api/v1/messages/:messageId
 * @access  Private
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Only sender can delete
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this message'
      });
    }

    await message.deleteOne();

    res.success(null, 'Message deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search users for messaging
 * @route   GET /api/v1/messages/users/search
 * @access  Private
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.find({
      _id: { $ne: req.user.id }, // Exclude current user
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
      .select('name email role department profilePicture')
      .limit(20);

    res.success(users, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};
