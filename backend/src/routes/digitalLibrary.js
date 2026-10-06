const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, handleValidationErrors } = require('../middleware/validation');
const digitalLibraryController = require('../controllers/digitalLibraryController');

const validateBookId = [validateObjectId('id'), handleValidationErrors];
const validateCoverBookId = [validateObjectId('bookId'), handleValidationErrors];

// Public/student routes
router.get('/books', protect, digitalLibraryController.getAllBooks);
router.get('/books/popular', protect, digitalLibraryController.getPopularBooks);
router.get('/books/:id', protect, validateBookId, digitalLibraryController.getBookById);
router.get('/my-reading-list', protect, digitalLibraryController.getMyReadingList);
router.get('/statistics', protect, digitalLibraryController.getStatistics);

// Reading features
router.put('/books/:id/progress', protect, validateBookId, digitalLibraryController.updateProgress);
router.post('/books/:id/bookmarks', protect, validateBookId, digitalLibraryController.addBookmark);
router.delete('/books/:id/bookmarks/:bookmarkId', protect, validateBookId, digitalLibraryController.deleteBookmark);
router.post('/books/:id/annotations', protect, validateBookId, digitalLibraryController.addAnnotation);
router.delete('/books/:id/annotations/:annotationId', protect, validateBookId, digitalLibraryController.deleteAnnotation);
router.post('/books/:id/rating', protect, validateBookId, digitalLibraryController.addRating);

// Download
router.get('/books/:id/download', protect, validateBookId, digitalLibraryController.downloadBook);

// Faculty/Admin routes
router.post('/books', protect, authorize('FACULTY', 'ADMIN'), digitalLibraryController.uploadBook);
router.post('/books/:bookId/cover', protect, authorize('FACULTY', 'ADMIN'), validateCoverBookId, digitalLibraryController.uploadCoverImage);
router.put('/books/:id', protect, authorize('FACULTY', 'ADMIN'), validateBookId, digitalLibraryController.updateBook);
router.delete('/books/:id', protect, authorize('FACULTY', 'ADMIN'), validateBookId, digitalLibraryController.deleteBook);

module.exports = router;
