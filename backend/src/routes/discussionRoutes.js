const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { discussionLimiter } = require('../middleware/rateLimiter');
const {
  getDepartmentDiscussions,
  getDiscussion,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  addReply,
  updateReply,
  deleteReply,
  toggleLike,
  toggleReplyLike,
  togglePin,
  toggleLock
} = require('../controllers/discussionController');

router.use(protect);

router.get('/department/:departmentId', getDepartmentDiscussions);
router.post('/', discussionLimiter, createDiscussion);
router.get('/:id', getDiscussion);
router.put('/:id', updateDiscussion);
router.delete('/:id', deleteDiscussion);

router.post('/:id/replies', discussionLimiter, addReply);
router.put('/:id/replies/:replyId', updateReply);
router.delete('/:id/replies/:replyId', deleteReply);

router.post('/:id/like', toggleLike);
router.post('/:id/replies/:replyId/like', toggleReplyLike);

router.put('/:id/pin', togglePin);
router.put('/:id/lock', toggleLock);

module.exports = router;
