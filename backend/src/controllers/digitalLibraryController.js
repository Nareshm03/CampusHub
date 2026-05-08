const DigitalBook = require('../models/DigitalBook');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for e-book uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/ebooks');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ebook-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.epub', '.mobi', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, EPUB, MOBI, and TXT files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

// Upload digital book
exports.uploadBook = [
  upload.single('book'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const {
        title,
        author,
        isbn,
        publisher,
        publishedDate,
        description,
        category,
        subject,
        department,
        semester,
        accessType,
        allowedDepartments,
        allowedSemesters,
        allowedUsers,
        allowDownload,
        allowPrint,
        allowCopy,
        language,
        edition,
        tags,
        totalPages
      } = req.body;

      const fileType = path.extname(req.file.originalname).toUpperCase().substring(1);
      const fileUrl = `/uploads/ebooks/${req.file.filename}`;

      const book = new DigitalBook({
        title,
        author,
        isbn,
        publisher,
        publishedDate,
        description,
        category,
        subject,
        department,
        semester,
        fileType,
        fileUrl,
        fileSize: req.file.size,
        totalPages: totalPages || null,
        accessType: accessType || 'Students Only',
        allowedDepartments: allowedDepartments ? JSON.parse(allowedDepartments) : [],
        allowedSemesters: allowedSemesters ? JSON.parse(allowedSemesters) : [],
        allowedUsers: allowedUsers ? JSON.parse(allowedUsers) : [],
        allowDownload: allowDownload !== 'false',
        allowPrint: allowPrint !== 'false',
        allowCopy: allowCopy === 'true',
        language: language || 'English',
        edition,
        tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
        uploadedBy: req.user._id,
        status: req.user.role === 'admin' ? 'Active' : 'Pending Review'
      });

      await book.save();

      res.status(201).json({
        success: true,
        message: 'Book uploaded successfully',
        data: book
      });
    } catch (error) {
      console.error('Upload book error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading book',
        error: error.message
      });
    }
  }
];

// Upload cover image
exports.uploadCoverImage = [
  multer({
    storage: multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/book-covers');
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images are allowed.'));
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
  }).single('cover'),
  async (req, res) => {
    try {
      const { bookId } = req.params;
      const book = await DigitalBook.findById(bookId);

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }

      // Check permission
      if (book.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this book'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No cover image uploaded'
        });
      }

      book.coverImage = `/uploads/book-covers/${req.file.filename}`;
      await book.save();

      res.json({
        success: true,
        message: 'Cover image uploaded successfully',
        data: { coverImage: book.coverImage }
      });
    } catch (error) {
      console.error('Upload cover error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading cover image',
        error: error.message
      });
    }
  }
];

// Get all books with filters
exports.getAllBooks = async (req, res) => {
  try {
    const {
      category,
      department,
      semester,
      subject,
      search,
      page = 1,
      limit = 20,
      sortBy = 'uploadedAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { status: 'Active' };

    // Apply filters
    if (category) query.category = category;
    if (department) query.department = department;
    if (semester) query.semester = semester;
    if (subject) query.subject = subject;

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const books = await DigitalBook.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('department', 'name')
      .populate('subject', 'name code')
      .populate('uploadedBy', 'name email')
      .select('-bookmarks -annotations -readingProgress -ratings.review');

    // Filter books based on user access
    const accessibleBooks = books.filter(book => book.canUserAccess(req.user));

    const total = await DigitalBook.countDocuments(query);

    res.json({
      success: true,
      data: {
        books: accessibleBooks,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching books',
      error: error.message
    });
  }
};

// Get book by ID
exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    const book = await DigitalBook.findById(id)
      .populate('department', 'name')
      .populate('subject', 'name code')
      .populate('uploadedBy', 'name email')
      .populate('ratings.user', 'name');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check access
    if (!book.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this book'
      });
    }

    // Increment view count
    book.incrementViews();
    await book.save();

    // Get user-specific data
    const userProgress = book.getUserProgress(req.user._id);
    const userBookmarks = book.getUserBookmarks(req.user._id);
    const userAnnotations = book.getUserAnnotations(req.user._id);

    res.json({
      success: true,
      data: {
        book,
        userProgress,
        userBookmarks,
        userAnnotations
      }
    });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching book',
      error: error.message
    });
  }
};

// Update reading progress
exports.updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPage, timeSpent } = req.body;

    const book = await DigitalBook.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (!book.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this book'
      });
    }

    const progress = book.updateProgress(req.user._id, currentPage);
    
    if (timeSpent) {
      progress.timeSpent = (progress.timeSpent || 0) + parseInt(timeSpent);
    }

    await book.save();

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: progress
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message
    });
  }
};

// Add bookmark
exports.addBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, note } = req.body;

    const book = await DigitalBook.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (!book.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this book'
      });
    }

    const bookmark = book.addBookmark(req.user._id, page, note);
    await book.save();

    res.status(201).json({
      success: true,
      message: 'Bookmark added successfully',
      data: bookmark
    });
  } catch (error) {
    console.error('Add bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding bookmark',
      error: error.message
    });
  }
};

// Delete bookmark
exports.deleteBookmark = async (req, res) => {
  try {
    const { id, bookmarkId } = req.params;

    const book = await DigitalBook.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const bookmark = book.bookmarks.id(bookmarkId);
    
    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: 'Bookmark not found'
      });
    }

    if (bookmark.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this bookmark'
      });
    }

    bookmark.remove();
    await book.save();

    res.json({
      success: true,
      message: 'Bookmark deleted successfully'
    });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bookmark',
      error: error.message
    });
  }
};

// Add annotation
exports.addAnnotation = async (req, res) => {
  try {
    const { id } = req.params;
    const annotationData = req.body;

    const book = await DigitalBook.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (!book.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this book'
      });
    }

    const annotation = book.addAnnotation(req.user._id, annotationData);
    await book.save();

    res.status(201).json({
      success: true,
      message: 'Annotation added successfully',
      data: annotation
    });
  } catch (error) {
    console.error('Add annotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding annotation',
      error: error.message
    });
  }
};

// Delete annotation
exports.deleteAnnotation = async (req, res) => {
  try {
    const { id, annotationId } = req.params;

    const book = await DigitalBook.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const annotation = book.annotations.id(annotationId);
    
    if (!annotation) {
      return res.status(404).json({
        success: false,
        message: 'Annotation not found'
      });
    }

    if (annotation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this annotation'
      });
    }

    annotation.remove();
    await book.save();

    res.json({
      success: true,
      message: 'Annotation deleted successfully'
    });
  } catch (error) {
    console.error('Delete annotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting annotation',
      error: error.message
    });
  }
};

// Add/Update rating
exports.addRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const book = await DigitalBook.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (!book.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this book'
      });
    }

    book.addRating(req.user._id, rating, review);
    await book.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        averageRating: book.averageRating,
        totalRatings: book.ratings.length
      }
    });
  } catch (error) {
    console.error('Add rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding rating',
      error: error.message
    });
  }
};

// Download book
exports.downloadBook = async (req, res) => {
  try {
    const { id } = req.params;

    const book = await DigitalBook.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (!book.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this book'
      });
    }

    if (!book.allowDownload && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Downloads are not allowed for this book'
      });
    }

    book.incrementDownloads();
    await book.save();

    const filePath = path.join(__dirname, '../..', book.fileUrl);
    
    res.download(filePath, `${book.title}.${book.fileType.toLowerCase()}`, (error) => {
      if (error) {
        console.error('Download error:', error);
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    console.error('Download book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading book',
      error: error.message
    });
  }
};

// Update book
exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const book = await DigitalBook.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check permission
    if (book.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this book'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'author', 'isbn', 'publisher', 'publishedDate', 'description',
      'category', 'subject', 'department', 'semester', 'accessType',
      'allowedDepartments', 'allowedSemesters', 'allowedUsers',
      'allowDownload', 'allowPrint', 'allowCopy', 'language', 'edition',
      'tags', 'totalPages', 'status'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        book[field] = updates[field];
      }
    });

    await book.save();

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: book
    });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating book',
      error: error.message
    });
  }
};

// Delete book
exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    const book = await DigitalBook.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Only admin or uploader can delete
    if (book.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this book'
      });
    }

    // Delete file
    try {
      const filePath = path.join(__dirname, '../..', book.fileUrl);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    // Delete cover image
    if (book.coverImage) {
      try {
        const coverPath = path.join(__dirname, '../..', book.coverImage);
        await fs.unlink(coverPath);
      } catch (error) {
        console.error('Error deleting cover:', error);
      }
    }

    await book.remove();

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting book',
      error: error.message
    });
  }
};

// Get popular books
exports.getPopularBooks = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const books = await DigitalBook.find({ status: 'Active' })
      .sort({ views: -1, downloads: -1, averageRating: -1 })
      .limit(parseInt(limit))
      .populate('department', 'name')
      .populate('subject', 'name code')
      .select('-bookmarks -annotations -readingProgress -ratings');

    const accessibleBooks = books.filter(book => book.canUserAccess(req.user));

    res.json({
      success: true,
      data: accessibleBooks
    });
  } catch (error) {
    console.error('Get popular books error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular books',
      error: error.message
    });
  }
};

// Get user's reading list
exports.getMyReadingList = async (req, res) => {
  try {
    const books = await DigitalBook.find({
      'readingProgress.user': req.user._id,
      status: 'Active'
    })
      .populate('department', 'name')
      .populate('subject', 'name code')
      .select('-annotations -ratings');

    const readingList = books.map(book => {
      const userProgress = book.getUserProgress(req.user._id);
      return {
        ...book.toObject(),
        progress: userProgress
      };
    });

    res.json({
      success: true,
      data: readingList
    });
  } catch (error) {
    console.error('Get reading list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reading list',
      error: error.message
    });
  }
};

// Get statistics
exports.getStatistics = async (req, res) => {
  try {
    const totalBooks = await DigitalBook.countDocuments({ status: 'Active' });
    const totalReaders = await DigitalBook.aggregate([
      { $unwind: '$readers' },
      { $group: { _id: '$readers' } },
      { $count: 'total' }
    ]);

    const categoryStats = await DigitalBook.aggregate([
      { $match: { status: 'Active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const mostRead = await DigitalBook.find({ status: 'Active' })
      .sort({ views: -1 })
      .limit(5)
      .select('title views downloads');

    res.json({
      success: true,
      data: {
        totalBooks,
        totalReaders: totalReaders[0]?.total || 0,
        categoryStats,
        mostRead
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};
