const Library = require('../models/Library');
const Student = require('../models/Student');

// @desc    Get all books (catalog)
// @route   GET /api/library/books
// @access  Private
const getBooks = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { 'book.title': { $regex: search, $options: 'i' } },
        { 'book.author': { $regex: search, $options: 'i' } },
        { 'book.isbn': { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query['book.category'] = category;

    const skip = (page - 1) * limit;
    const [books, total] = await Promise.all([
      Library.find(query).skip(skip).limit(parseInt(limit)).select('book'),
      Library.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: { books, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single book
// @route   GET /api/library/books/:id
// @access  Private
const getBookById = async (req, res, next) => {
  try {
    const book = await Library.findById(req.params.id).select('book');
    if (!book) return res.status(404).json({ success: false, error: 'Book not found' });
    res.json({ success: true, data: book });
  } catch (error) {
    next(error);
  }
};

// @desc    Add book to catalog
// @route   POST /api/library/books
// @access  Private/Admin
const addBook = async (req, res, next) => {
  try {
    const { title, author, isbn, category, description, totalCopies } = req.body;
    if (!title || !author) {
      return res.status(400).json({ success: false, error: 'Title and author are required' });
    }
    const book = await Library.create({
      book: { title, author, isbn, category, description, totalCopies, availableCopies: totalCopies || 1 }
    });
    res.status(201).json({ success: true, data: book });
  } catch (error) {
    next(error);
  }
};

// @desc    Issue book to student
// @route   POST /api/library/issue
// @access  Private/Admin
const issueBook = async (req, res, next) => {
  try {
    const { bookId, studentId, dueDate } = req.body;
    if (!bookId || !studentId || !dueDate) {
      return res.status(400).json({ success: false, error: 'bookId, studentId and dueDate are required' });
    }

    const book = await Library.findById(bookId);
    if (!book) return res.status(404).json({ success: false, error: 'Book not found' });
    if (book.book.availableCopies <= 0) {
      return res.status(400).json({ success: false, error: 'No copies available' });
    }

    const alreadyIssued = book.transactions.some(
      t => t.student.toString() === studentId && t.status === 'ISSUED'
    );
    if (alreadyIssued) {
      return res.status(400).json({ success: false, error: 'Book already issued to this student' });
    }

    book.transactions.push({ student: studentId, dueDate: new Date(dueDate) });
    book.book.availableCopies -= 1;
    await book.save();

    res.json({ success: true, message: 'Book issued successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Return book
// @route   POST /api/library/return/:transactionId
// @access  Private/Admin
const returnBook = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const book = await Library.findOne({ 'transactions._id': transactionId });
    if (!book) return res.status(404).json({ success: false, error: 'Transaction not found' });

    const transaction = book.transactions.id(transactionId);
    if (!transaction) return res.status(404).json({ success: false, error: 'Transaction not found' });
    if (transaction.status === 'RETURNED') {
      return res.status(400).json({ success: false, error: 'Book already returned' });
    }

    transaction.returnDate = new Date();
    transaction.status = 'RETURNED';

    if (new Date() > transaction.dueDate) {
      const daysLate = Math.ceil((new Date() - transaction.dueDate) / (1000 * 60 * 60 * 24));
      transaction.fine = daysLate * 5; // ₹5 per day
    }

    book.book.availableCopies += 1;
    await book.save();

    res.json({ success: true, message: 'Book returned successfully', fine: transaction.fine });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student's issued books
// @route   GET /api/library/my-books
// @access  Private/Student
const getMyBooks = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ success: false, error: 'Student profile not found' });

    const books = await Library.find({ 'transactions.student': student._id }).select('book transactions');

    const issuedBooks = books.flatMap(b =>
      b.transactions
        .filter(t => t.student.toString() === student._id.toString() && t.status === 'ISSUED')
        .map(t => ({ ...b.book.toObject(), bookId: b._id, transaction: t }))
    );

    res.json({ success: true, data: issuedBooks });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all issued books (admin)
// @route   GET /api/library/issued
// @access  Private/Admin
const getIssuedBooks = async (req, res, next) => {
  try {
    const { status = 'ISSUED' } = req.query;
    const books = await Library.find({ 'transactions.0': { $exists: true } })
      .select('book transactions')
      .populate('transactions.student', 'name rollNumber');

    const transactions = books.flatMap(b =>
      b.transactions
        .filter(t => status === 'ALL' || t.status === status)
        .map(t => ({
          bookId: b._id,
          bookTitle: b.book.title,
          bookAuthor: b.book.author,
          isbn: b.book.isbn,
          transaction: t
        }))
    );

    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBooks, getBookById, addBook, issueBook, returnBook, getMyBooks, getIssuedBooks };
