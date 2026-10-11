// Multer staging factory: every upload lands in uploads/.tmp/ first and is
// persisted through the storage adapter by the controller. Temp files are
// always deleted after persistence, so no request ever leaves stray files
// behind and the Azure provider never needs a local final copy.
//
// Validation mirrors the pre-existing per-category multer configs (same
// mimetypes, extensions, and per-file size caps). An optional global ceiling
// UPLOAD_MAX_FILE_BYTES can only tighten those caps, never loosen them.
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { stagingDir, STORAGE_CATEGORIES } = require('./storage');

try {
  fs.mkdirSync(stagingDir(), { recursive: true });
} catch (_) {}

function effectiveMaxBytes(category) {
  const spec = STORAGE_CATEGORIES[category];
  if (!spec) throw new Error(`Unknown upload category: ${category}`);
  const globalCap = process.env.UPLOAD_MAX_FILE_BYTES
    ? Number(process.env.UPLOAD_MAX_FILE_BYTES)
    : NaN;
  if (Number.isFinite(globalCap) && globalCap > 0) {
    return Math.min(spec.maxBytes, globalCap);
  }
  return spec.maxBytes;
}

function categoryFileFilter(category) {
  const spec = STORAGE_CATEGORIES[category];
  // filterMode preserves each category's pre-existing gate exactly:
  // 'both' (students, study-materials), 'ext' (covers, logos, ebooks,
  // placement docs), 'mime' (homework).
  const mode = spec.filterMode || 'both';
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = spec.mimetypes.includes(file.mimetype);
    const extOk = spec.exts.includes(ext);
    const ok = mode === 'both' ? mimeOk && extOk : mode === 'ext' ? extOk : mimeOk;
    if (ok) {
      cb(null, true);
    } else {
      cb(
        new Error(
          category === 'students' || category === 'book-covers' || category === 'company-logos'
            ? 'Only JPEG, PNG, and WebP images are allowed'
            : `File type not allowed. Allowed: ${spec.exts.join(', ')}`
        ),
        false
      );
    }
  };
}

const stagingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = stagingDir();
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (_) {}
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `staging-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

function uploadFor(category, { files } = {}) {
  return multer({
    storage: stagingStorage,
    limits: {
      fileSize: effectiveMaxBytes(category),
      ...(files ? { files } : { files: 1 }),
    },
    fileFilter: categoryFileFilter(category),
  });
}

// Wrap a multer middleware so client-caused upload failures (wrong type,
// too large) return 400 instead of falling through to a 500, and staged
// temp files from a partially-accepted batch are discarded.
function singleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        const { discardStagedFiles } = require('./storage');
        discardStagedFiles(req.file ? [req.file] : req.files);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed',
        });
      }
      next();
    });
  };
}

module.exports = { stagingDir, effectiveMaxBytes, uploadFor, singleUpload };
