const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  page: {
    type: Number,
    required: true
  },
  note: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const annotationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  page: {
    type: Number,
    required: true
  },
  text: String,
  highlightedText: String,
  color: {
    type: String,
    default: '#FFEB3B'
  },
  position: {
    x: Number,
    y: Number,
    width: Number,
    height: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const readingProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: Number,
  percentage: {
    type: Number,
    default: 0
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  },
  timeSpent: {
    type: Number,
    default: 0 // in minutes
  }
});

const digitalBookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true
  },
  publisher: String,
  publishedDate: Date,
  description: String,
  category: {
    type: String,
    enum: ['Textbook', 'Reference', 'Journal', 'Magazine', 'Research Paper', 'eBook', 'Other'],
    default: 'eBook'
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  semester: Number,
  
  // File details
  fileType: {
    type: String,
    enum: ['PDF', 'EPUB', 'MOBI', 'TXT'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: Number, // in bytes
  totalPages: Number,
  
  // Cover image
  coverImage: String,
  
  // Access control
  accessType: {
    type: String,
    enum: ['Public', 'Students Only', 'Faculty Only', 'Department Specific', 'Semester Specific', 'Private'],
    default: 'Students Only'
  },
  allowedDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  allowedSemesters: [Number],
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Download options
  allowDownload: {
    type: Boolean,
    default: true
  },
  allowPrint: {
    type: Boolean,
    default: true
  },
  allowCopy: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  language: {
    type: String,
    default: 'English'
  },
  edition: String,
  tags: [String],
  
  // Statistics
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  readers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Reading features
  bookmarks: [bookmarkSchema],
  annotations: [annotationSchema],
  readingProgress: [readingProgressSchema],
  
  // Ratings and reviews
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  },
  
  // Upload info
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending Review', 'Archived'],
    default: 'Active'
  },
  
  // Search optimization
  searchableText: String
}, {
  timestamps: true
});

// Indexes for better query performance
digitalBookSchema.index({ title: 'text', author: 'text', description: 'text', tags: 'text' });
digitalBookSchema.index({ category: 1, status: 1 });
digitalBookSchema.index({ department: 1, semester: 1 });
digitalBookSchema.index({ uploadedBy: 1 });
digitalBookSchema.index({ averageRating: -1 });

// Methods

// Check if user has access to book
digitalBookSchema.methods.canUserAccess = function(user) {
  if (this.status !== 'Active') return false;
  if (this.accessType === 'Public') return true;
  
  if (this.accessType === 'Private') {
    return this.allowedUsers.some(id => id.toString() === user._id.toString());
  }
  
  if (this.accessType === 'Students Only') {
    return user.role === 'student' || user.role === 'faculty' || user.role === 'admin';
  }
  
  if (this.accessType === 'Faculty Only') {
    return user.role === 'faculty' || user.role === 'admin';
  }
  
  if (this.accessType === 'Department Specific') {
    return this.allowedDepartments.some(dept => dept.toString() === user.department?.toString());
  }
  
  if (this.accessType === 'Semester Specific') {
    return this.allowedSemesters.includes(user.semester);
  }
  
  return false;
};

// Get user's reading progress
digitalBookSchema.methods.getUserProgress = function(userId) {
  return this.readingProgress.find(p => p.user.toString() === userId.toString());
};

// Update reading progress
digitalBookSchema.methods.updateProgress = function(userId, currentPage) {
  let progress = this.readingProgress.find(p => p.user.toString() === userId.toString());
  
  if (!progress) {
    progress = {
      user: userId,
      currentPage: currentPage,
      totalPages: this.totalPages,
      percentage: this.totalPages ? (currentPage / this.totalPages) * 100 : 0,
      lastReadAt: new Date(),
      timeSpent: 0
    };
    this.readingProgress.push(progress);
  } else {
    progress.currentPage = currentPage;
    progress.percentage = this.totalPages ? (currentPage / this.totalPages) * 100 : 0;
    progress.lastReadAt = new Date();
  }
  
  // Add to readers list if not already there
  if (!this.readers.includes(userId)) {
    this.readers.push(userId);
  }
  
  return progress;
};

// Add bookmark
digitalBookSchema.methods.addBookmark = function(userId, page, note = '') {
  const bookmark = {
    user: userId,
    page: page,
    note: note,
    createdAt: new Date()
  };
  this.bookmarks.push(bookmark);
  return bookmark;
};

// Get user's bookmarks
digitalBookSchema.methods.getUserBookmarks = function(userId) {
  return this.bookmarks.filter(b => b.user.toString() === userId.toString());
};

// Add annotation
digitalBookSchema.methods.addAnnotation = function(userId, annotationData) {
  const annotation = {
    user: userId,
    page: annotationData.page,
    text: annotationData.text,
    highlightedText: annotationData.highlightedText,
    color: annotationData.color || '#FFEB3B',
    position: annotationData.position,
    createdAt: new Date()
  };
  this.annotations.push(annotation);
  return annotation;
};

// Get user's annotations
digitalBookSchema.methods.getUserAnnotations = function(userId) {
  return this.annotations.filter(a => a.user.toString() === userId.toString());
};

// Add/Update rating
digitalBookSchema.methods.addRating = function(userId, rating, review = '') {
  const existingRating = this.ratings.find(r => r.user.toString() === userId.toString());
  
  if (existingRating) {
    existingRating.rating = rating;
    existingRating.review = review;
    existingRating.createdAt = new Date();
  } else {
    this.ratings.push({
      user: userId,
      rating: rating,
      review: review,
      createdAt: new Date()
    });
  }
  
  // Recalculate average rating
  this.calculateAverageRating();
};

// Calculate average rating
digitalBookSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    return;
  }
  
  const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
  this.averageRating = sum / this.ratings.length;
};

// Increment view count
digitalBookSchema.methods.incrementViews = function() {
  this.views += 1;
};

// Increment download count
digitalBookSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
};

// Pre-save middleware
digitalBookSchema.pre('save', function(next) {
  // Create searchable text
  this.searchableText = `${this.title} ${this.author} ${this.description} ${this.tags.join(' ')}`.toLowerCase();
  next();
});

module.exports = mongoose.model('DigitalBook', digitalBookSchema);
