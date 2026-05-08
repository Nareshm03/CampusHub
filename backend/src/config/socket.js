const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        const allowedOrigins = process.env.NODE_ENV === 'production'
          ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
          : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];
        
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(socket.userId);

    // Handle user joining a conversation
    socket.on('join_conversation', (otherUserId) => {
      const conversationId = Message.getConversationId(socket.userId, otherUserId);
      socket.join(conversationId);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Handle user leaving a conversation
    socket.on('leave_conversation', (otherUserId) => {
      const conversationId = Message.getConversationId(socket.userId, otherUserId);
      socket.leave(conversationId);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Handle sending a message
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, type = 'text', fileUrl, fileName } = data;

        // Validate receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          socket.emit('error', { message: 'Receiver not found' });
          return;
        }

        const conversationId = Message.getConversationId(socket.userId, receiverId);

        // Create message in database
        const message = await Message.create({
          sender: socket.userId,
          receiver: receiverId,
          content,
          type,
          fileUrl,
          fileName,
          conversation: conversationId
        });

        // Populate sender and receiver details
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'name email role profilePicture')
          .populate('receiver', 'name email role profilePicture');

        // Emit to conversation room
        io.to(conversationId).emit('new_message', populatedMessage);

        // Also emit to receiver's personal room (for notifications)
        io.to(receiverId).emit('message_notification', {
          message: populatedMessage,
          conversationId
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      const conversationId = Message.getConversationId(socket.userId, receiverId);

      socket.to(conversationId).emit('user_typing', {
        userId: socket.userId,
        isTyping,
        conversationId
      });
    });

    // Handle message read status
    socket.on('mark_read', async (data) => {
      try {
        const { senderId } = data;
        const conversationId = Message.getConversationId(socket.userId, senderId);

        await Message.updateMany(
          {
            conversation: conversationId,
            receiver: socket.userId,
            isRead: false
          },
          {
            isRead: true,
            readAt: new Date()
          }
        );

        // Notify sender that messages were read
        io.to(conversationId).emit('messages_read', {
          conversationId,
          readBy: socket.userId,
          readAt: new Date()
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle user going online/offline
    socket.on('user_status', (status) => {
      socket.broadcast.emit('user_status_change', {
        userId: socket.userId,
        status
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      socket.broadcast.emit('user_status_change', {
        userId: socket.userId,
        status: 'offline'
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };
