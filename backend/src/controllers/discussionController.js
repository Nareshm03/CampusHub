const Discussion = require('../models/Discussion');
const Department = require('../models/Department');

/**
 * @desc    Get all discussions for a department
 * @route   GET /api/v1/discussions/department/:departmentId
 * @access  Private
 */
exports.getDepartmentDiscussions = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const { category, page = 1, limit = 20, search } = req.query;

    const query = { department: departmentId };

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const discussions = await Discussion.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('author', 'name email role profilePicture')
      .populate('department', 'name code')
      .populate('replies.author', 'name email role profilePicture');

    const total = await Discussion.countDocuments(query);

    res.success(
      {
        discussions,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDiscussions: total
      },
      'Discussions retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single discussion
 * @route   GET /api/v1/discussions/:id
 * @access  Private
 */
exports.getDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('author', 'name email role profilePicture')
      .populate('department', 'name code')
      .populate('replies.author', 'name email role profilePicture');

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    // Increment view count
    discussion.views += 1;
    await discussion.save();

    res.status(200).json({ success: true, message: 'Discussion retrieved successfully', data: discussion });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new discussion
 * @route   POST /api/v1/discussions
 * @access  Private
 */
exports.createDiscussion = async (req, res, next) => {
  try {
    const { title, content, department, category, tags } = req.body;

    const deptExists = await Department.findById(department);
    if (!deptExists) return res.status(404).json({ success: false, error: 'Department not found' });

    // Spam check: prevent duplicate posts within 1 minute
    const recentPost = await Discussion.findOne({
      author: req.user.id,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
    });
    if (recentPost) return res.status(429).json({ success: false, error: 'Please wait before posting again' });

    const discussion = await Discussion.create({
      title, content, author: req.user.id, department, category, tags: tags || []
    });

    const populated = await Discussion.findById(discussion._id)
      .populate('author', 'name email role profilePicture')
      .populate('department', 'name code');

    res.status(201).json({ success: true, message: 'Discussion created successfully', data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a discussion
 * @route   PUT /api/v1/discussions/:id
 * @access  Private
 */
exports.updateDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    // Check if user is author or admin
    if (discussion.author.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to update this discussion' });
    }

    if (discussion.isLocked) {
      return res.status(403).json({ success: false, error: 'This discussion is locked' });
    }

    const { title, content, category, tags } = req.body;

    if (title) discussion.title = title;
    if (content) discussion.content = content;
    if (category) discussion.category = category;
    if (tags) discussion.tags = tags;

    await discussion.save();

    const updatedDiscussion = await Discussion.findById(discussion._id)
      .populate('author', 'name email role profilePicture')
      .populate('department', 'name code');

    res.status(200).json({ success: true, message: 'Discussion updated successfully', data: updatedDiscussion });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a discussion
 * @route   DELETE /api/v1/discussions/:id
 * @access  Private
 */
exports.deleteDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    // Check if user is author or admin
    if (discussion.author.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this discussion' });
    }

    await discussion.deleteOne();

    res.status(200).json({ success: true, message: 'Discussion deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a reply to a discussion
 * @route   POST /api/v1/discussions/:id/replies
 * @access  Private
 */
exports.addReply = async (req, res, next) => {
  try {
    const { content } = req.body;
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) return res.status(404).json({ success: false, error: 'Discussion not found' });
    if (discussion.isLocked) return res.status(403).json({ success: false, error: 'This discussion is locked' });

    // Spam check: prevent duplicate replies within 30 seconds
    const lastReply = discussion.replies
      .filter(r => String(r.author) === String(req.user.id))
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (lastReply && Date.now() - new Date(lastReply.createdAt).getTime() < 30 * 1000) {
      return res.status(429).json({ success: false, error: 'Please wait before replying again' });
    }

    discussion.replies.push({ author: req.user.id, content, createdAt: new Date(), updatedAt: new Date() });
    await discussion.save();

    const updated = await Discussion.findById(discussion._id)
      .populate('author', 'name email role profilePicture')
      .populate('replies.author', 'name email role profilePicture');

    res.status(201).json({ success: true, message: 'Reply added successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a reply
 * @route   PUT /api/v1/discussions/:id/replies/:replyId
 * @access  Private
 */
exports.updateReply = async (req, res, next) => {
  try {
    const { content } = req.body;
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    const reply = discussion.replies.id(req.params.replyId);

    if (!reply) {
      return res.status(404).json({ success: false, error: 'Reply not found' });
    }

    // Check if user is reply author or admin
    if (reply.author.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to update this reply' });
    }

    reply.content = content;
    reply.updatedAt = new Date();

    await discussion.save();

    const updatedDiscussion = await Discussion.findById(discussion._id)
      .populate('replies.author', 'name email role profilePicture');

    res.status(200).json({ success: true, message: 'Reply updated successfully', data: updatedDiscussion });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a reply
 * @route   DELETE /api/v1/discussions/:id/replies/:replyId
 * @access  Private
 */
exports.deleteReply = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    const reply = discussion.replies.id(req.params.replyId);

    if (!reply) {
      return res.status(404).json({ success: false, error: 'Reply not found' });
    }

    // Check if user is reply author or admin
    if (reply.author.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this reply' });
    }

    reply.deleteOne();
    await discussion.save();

    res.status(200).json({ success: true, message: 'Reply deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle like on discussion
 * @route   POST /api/v1/discussions/:id/like
 * @access  Private
 */
exports.toggleLike = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const discussion = await Discussion.findById(req.params.id).select('likes');
    if (!discussion) return res.status(404).json({ success: false, error: 'Discussion not found' });

    const hasLiked = discussion.likes.map(String).includes(String(userId));
    const update = hasLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } };
    const updated = await Discussion.findByIdAndUpdate(req.params.id, update, { new: true }).select('likes');

    res.status(200).json({ success: true, message: 'Like toggled successfully', data: { likes: updated.likes.length } });
  } catch (error) {
    next(error);
  }
};

exports.toggleReplyLike = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const discussion = await Discussion.findById(req.params.id).select('replies');
    if (!discussion) return res.status(404).json({ success: false, error: 'Discussion not found' });

    const reply = discussion.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, error: 'Reply not found' });

    const hasLiked = reply.likes.map(String).includes(String(userId));
    const update = hasLiked
      ? { $pull: { 'replies.$.likes': userId } }
      : { $addToSet: { 'replies.$.likes': userId } };

    await Discussion.updateOne({ _id: req.params.id, 'replies._id': req.params.replyId }, update);
    const updatedReply = (await Discussion.findById(req.params.id).select('replies')).replies.id(req.params.replyId);

    res.status(200).json({ success: true, message: 'Like toggled successfully', data: { likes: updatedReply.likes.length } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Pin/unpin a discussion (admin only)
 * @route   PUT /api/v1/discussions/:id/pin
 * @access  Private/Admin
 */
exports.togglePin = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FACULTY') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    discussion.isPinned = !discussion.isPinned;
    await discussion.save();

    res.status(200).json({ success: true, message: 'Discussion pin status updated', data: { isPinned: discussion.isPinned } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lock/unlock a discussion (admin only)
 * @route   PUT /api/v1/discussions/:id/lock
 * @access  Private/Admin
 */
exports.toggleLock = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FACULTY') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    discussion.isLocked = !discussion.isLocked;
    await discussion.save();

    res.status(200).json({ success: true, message: 'Discussion lock status updated', data: { isLocked: discussion.isLocked } });
  } catch (error) {
    next(error);
  }
};


