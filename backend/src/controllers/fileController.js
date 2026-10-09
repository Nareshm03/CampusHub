// Authenticated file serving.
//
// Replaces the former blanket `express.static('uploads')` mount, which
// exposed every uploaded file (ebooks, resumes, homework, photos) without
// authentication and bypassed all controller download gates.
//
// Rules:
// - every request requires a valid JWT (protect) — no token in URL;
// - :category allowlist with per-category authorization;
// - filenames are sanitized (basename, safe charset, resolved path must stay
//   inside the category dir) — no traversal, no filesystem path leakage
//   (unknown/missing files are uniformly 404);
// - categories with dedicated controller endpoints (placement-documents,
//   homework, study-materials) are NOT served here.
const path = require('path');
const fs = require('fs');
const DigitalBook = require('../models/DigitalBook');
const User = require('../models/User');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

const CATEGORY_DIRS = {
  students: 'students',
  'book-covers': 'book-covers',
  'company-logos': 'company-logos',
  ebooks: 'ebooks'
};

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

async function authorizeFile(req, category, filename) {
  const user = req.user;

  if (category === 'book-covers' || category === 'company-logos') {
    // In-app display assets; every viewer is authenticated.
    return true;
  }

  if (category === 'students') {
    // Profile photos: owner, faculty rosters, or admin.
    if (user.role === 'ADMIN' || user.role === 'FACULTY') return true;
    const owner = await User.findOne({ profilePhoto: filename }).select('_id').lean();
    return !!owner && owner._id.toString() === user._id.toString();
  }

  if (category === 'ebooks') {
    // Same read gate as the book detail/downloads controller.
    const book = await DigitalBook.findOne({ fileUrl: `/uploads/ebooks/${filename}` });
    if (!book) return false;
    return book.canUserAccess(user);
  }

  return false;
}

const serveFile = async (req, res) => {
  try {
    const { category, filename } = req.params;

    if (!Object.prototype.hasOwnProperty.call(CATEGORY_DIRS, category) || !SAFE_NAME.test(filename || '')) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const dir = path.join(UPLOAD_ROOT, CATEGORY_DIRS[category]);
    const resolved = path.resolve(dir, path.basename(filename));
    if (path.relative(path.resolve(dir), resolved).startsWith('..') || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const allowed = await authorizeFile(req, category, path.basename(filename));
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Access denied to this file' });
    }

    return res.sendFile(resolved);
  } catch (error) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }
};

module.exports = { serveFile };
