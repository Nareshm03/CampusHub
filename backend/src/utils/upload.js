const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// The destination directory is not guaranteed to exist on a fresh checkout.
// Ensure it (no contract change: same path, same filenames).
const UPLOAD_DIR = 'uploads/students/';
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (_) {
  // Created lazily per-request below if this fails (e.g. read-only CWD).
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    } catch (_) {}
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

// File filter with enhanced security
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

// Configure multer with security limits
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
    files: 1
  },
  fileFilter: fileFilter
});

module.exports = upload;