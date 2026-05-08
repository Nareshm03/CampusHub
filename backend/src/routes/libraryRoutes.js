const express = require('express');
const { getBooks, getBookById, addBook, issueBook, returnBook, getMyBooks, getIssuedBooks } = require('../controllers/libraryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Catalog
router.get('/books', protect, getBooks);
router.get('/books/:id', protect, getBookById);
router.post('/books', protect, authorize('admin'), addBook);

// Student
router.get('/my-books', protect, getMyBooks);

// Admin
router.get('/issued', protect, authorize('admin'), getIssuedBooks);
router.post('/issue', protect, authorize('admin'), issueBook);
router.post('/return/:transactionId', protect, authorize('admin'), returnBook);

module.exports = router;
