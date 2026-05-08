const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getConversation,
  getConversations,
  markAsRead,
  sendMessage,
  deleteMessage,
  searchUsers
} = require('../controllers/messageController');

// Apply authentication to all routes
router.use(protect);

// Search users
router.get('/users/search', searchUsers);

// Get all conversations
router.get('/conversations', getConversations);

// Conversation routes
router.get('/:userId', getConversation);
router.post('/:userId', sendMessage);
router.put('/:userId/read', markAsRead);

// Delete message
router.delete('/:messageId', deleteMessage);

module.exports = router;
