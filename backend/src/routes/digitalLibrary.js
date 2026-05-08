const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const digitalLibraryController = require('../controllers/digitalLibraryController');

// Public/student routes
router.get('/books', protect, digitalLibraryController.getAllBooks);
router.get('/books/popular', protect, digitalLibraryController.getPopularBooks);
router.get('/books/:id', protect, digitalLibraryController.getBookById);
router.get('/my-reading-list', protect, digitalLibraryController.getMyReadingList);
router.get('/statistics', protect, digitalLibraryController.getStatistics);

// Reading features
router.put('/books/:id/progress', protect, digitalLibraryController.updateProgress);
router.post('/books/:id/bookmarks', protect, digitalLibraryController.addBookmark);
router.delete('/books/:id/bookmarks/:bookmarkId', protect, digitalLibraryController.deleteBookmark);
router.post('/books/:id/annotations', protect, digitalLibraryController.addAnnotation);
router.delete('/books/:id/annotations/:annotationId', protect, digitalLibraryController.deleteAnnotation);
router.post('/books/:id/rating', protect, digitalLibraryController.addRating);

// Download
router.get('/books/:id/download', protect, digitalLibraryController.downloadBook);

// Faculty/Admin routes
router.post('/books', protect, authorize('faculty', 'admin'), digitalLibraryController.uploadBook);
router.post('/books/:bookId/cover', protect, authorize('faculty', 'admin'), digitalLibraryController.uploadCoverImage);
router.put('/books/:id', protect, authorize('faculty', 'admin'), digitalLibraryController.updateBook);
router.delete('/books/:id', protect, authorize('faculty', 'admin'), digitalLibraryController.deleteBook);

module.exports = router;
