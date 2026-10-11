// Authenticated file serving.
//
// Every request requires a valid JWT (protect) — no token in URL;
// :category allowlist with per-category authorization;
// filenames are sanitized (basename, safe charset) — no traversal, no
// filesystem path leakage (unknown/missing files are uniformly 404);
// categories with dedicated controller endpoints (placement-documents,
// homework, study-materials, assignments) are NOT served here.
//
// Reads go through the storage adapter (local dir today, private blob
// tomorrow) AFTER authorization. Storage never replaces authorization and
// no raw internal storage URL is ever exposed.
const DigitalBook = require('../models/DigitalBook');
const Student = require('../models/Student');
const {
  getStorage,
  assertCategory,
  assertSafeFilename,
  StorageError,
} = require('../utils/storage');

const CATEGORY_DIRS = {
  students: 'students',
  'book-covers': 'book-covers',
  'company-logos': 'company-logos',
  ebooks: 'ebooks',
};

async function authorizeFile(req, category, filename) {
  const user = req.user;

  if (category === 'book-covers' || category === 'company-logos') {
    // In-app display assets; every viewer is authenticated.
    return true;
  }

  if (category === 'students') {
    // Profile photos: owner, faculty rosters, or admin. Ownership resolves
    // through the Student profile (profilePhoto lives on Student, keyed by
    // userId) — never through a filesystem path.
    if (user.role === 'ADMIN' || user.role === 'FACULTY') return true;
    const owner = await Student.findOne({ profilePhoto: filename }).select('userId').lean();
    return !!owner && owner.userId && owner.userId.toString() === user._id.toString();
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

    if (
      !Object.prototype.hasOwnProperty.call(CATEGORY_DIRS, category) ||
      typeof filename !== 'string'
    ) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    assertCategory(category);
    assertSafeFilename(filename);

    const { storage } = getStorage();
    const exists = await storage.exists({ category, filename });
    if (!exists) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const allowed = await authorizeFile(req, category, filename);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Access denied to this file' });
    }

    const { stream, bytes, contentType } = await storage.get({ category, filename });
    if (contentType) res.setHeader('Content-Type', contentType);
    if (typeof bytes === 'number') res.setHeader('Content-Length', String(bytes));
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({ success: false, error: 'File not found' });
      } else {
        res.end();
      }
    });
    return stream.pipe(res);
  } catch (error) {
    if (error instanceof StorageError && error.code === 'STORAGE_CONFIG_ERROR') {
      return res.status(503).json({ success: false, error: error.message });
    }
    return res.status(404).json({ success: false, error: 'File not found' });
  }
};

// GET /api/v1/files/usage — ADMIN only. Application-side storage accounting
// by category (bytes/files), active provider, and quota state. This is a
// diagnostics aid, not a billing source: Azure transactions/egress must be
// monitored in Azure Cost Management.
const getUsage = async (req, res) => {
  try {
    const { getUsageSummary } = require('../utils/storage');
    const { storage, config } = getStorage();
    const summary = await getUsageSummary(storage, config);
    return res.json({ success: true, data: summary });
  } catch (error) {
    if (error instanceof StorageError) {
      return res.status(error.status || 500).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Error computing storage usage' });
  }
};

module.exports = { serveFile, getUsage };
