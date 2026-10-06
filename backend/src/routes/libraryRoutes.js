const express = require('express');
const { getBooks, getBookById, addBook, updateBook, deleteBook, issueBook, returnBook, getMyBooks, getIssuedBooks } = require('../controllers/libraryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Catalog
router.get('/books', protect, getBooks);
router.get('/books/:id', protect, getBookById);
router.post('/books', protect, authorize('ADMIN'), addBook);
router.put('/books/:id', protect, authorize('ADMIN'), updateBook);
router.delete('/books/:id', protect, authorize('ADMIN'), deleteBook);

// Student
router.get('/my-books', protect, getMyBooks);

// Admin
router.get('/issued', protect, authorize('ADMIN'), getIssuedBooks);
router.post('/issue', protect, authorize('ADMIN'), issueBook);
router.post('/return/:transactionId', protect, authorize('ADMIN'), returnBook);

module.exports = router;
