// CampusHub storage adapter — local filesystem today, private Azure Blob
// Storage tomorrow. Single source of truth for every upload category.
//
// Design:
// - `local` provider: files live under <backend>/uploads/<category-dir>/,
//   exactly where the pre-existing multer diskStorage destinations wrote.
//   Database references keep their established shapes
//   (`/uploads/<category>/<file>`, bare student photo filenames, and the
//   `path`/`filepath` fields on homework/study/assignment documents).
// - `azure` provider: files live in ONE private container under the blob
//   name `<category>/<filename>`. The container is never public and the
//   frontend never receives credentials or blob URLs — every read is
//   authorized in a controller first, then streamed through the API.
// - Provider selection is explicit via FILE_STORAGE_PROVIDER. When `azure`
//   is selected but account/container/credential config is unavailable, the
//   adapter throws a StorageConfigError on first use. It NEVER silently
//   falls back to local storage in an Azure deployment.
// - Quota (STORAGE_MAX_BYTES, default 4,000,000,000 bytes) is an
//   application-side upload guard, NOT an account-wide billing cap: it only
//   refuses API uploads that would push stored bytes past the limit, with
//   HTTP 413. It is not atomic (concurrent uploads can race past it) and it
//   does not track Azure metering (transactions/egress). Monitor real usage
//   in Azure Cost Management. Breaching the allowance never auto-upgrades
//   anything — an operator must intervene (see docs in getUsageSummary).
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

// Default application-side upload guard: 4,000,000,000 bytes (~3.73 GiB),
// deliberately headroom below the ~5 GB student free allowance. Override
// with STORAGE_MAX_BYTES. This is NOT an account-wide billing cap.
const DEFAULT_STORAGE_MAX_BYTES = 4000000000;

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// Local root override (tests and mounted volumes). Production default is
// <backend>/uploads. When FILE_STORAGE_LOCAL_ROOT is set, both final files
// and the .tmp staging area live under it.
function uploadRoot(env = process.env) {
  const override = env.FILE_STORAGE_LOCAL_ROOT;
  if (override && String(override).trim()) return path.resolve(String(override).trim());
  return UPLOAD_ROOT;
}

function stagingDir(env = process.env) {
  return path.join(uploadRoot(env), '.tmp');
}

const STAGING_DIR = path.join(UPLOAD_ROOT, '.tmp');

// Category registry. Limits and allowlists mirror the pre-existing multer
// configurations exactly (see git history for the originals):
//  - students:            utils/upload.js (2MB images)
//  - book-covers:         digitalLibraryController coverUpload (5MB images)
//  - company-logos:       companyController upload (2MB images)
//  - ebooks:              digitalLibraryController upload (100MB docs)
//  - homework:            homeworkController upload (10MB docs/images/archives)
//  - study-materials:     utils/studyMaterialUpload.js (25MB docs/images)
//  - placement-documents: placementController upload (10MB docs/images)
//  - assignments:         NEW dedicated dir. Assignment routes previously
//                         reused the students photo uploader, so assignment
//                         files landed in uploads/students/ with an image-only
//                         filter. New writes go to uploads/assignments/ with a
//                         document-appropriate policy; reads resolve the stored
//                         filepath whatever directory it points at.
const STORAGE_CATEGORIES = {
  students: {
    dir: 'students',
    maxBytes: 2 * MB,
    filterMode: 'both',
    mimetypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    exts: ['.jpg', '.jpeg', '.png', '.webp'],
    filenamePrefix: 'profile-',
  },
  'book-covers': {
    dir: 'book-covers',
    maxBytes: 5 * MB,
    filterMode: 'ext',
    mimetypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    exts: ['.jpg', '.jpeg', '.png', '.webp'],
    filenamePrefix: 'cover-',
  },
  'company-logos': {
    dir: 'company-logos',
    maxBytes: 2 * MB,
    filterMode: 'ext',
    mimetypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    exts: ['.jpg', '.jpeg', '.png', '.webp'],
    filenamePrefix: 'logo-',
  },
  ebooks: {
    dir: 'ebooks',
    maxBytes: 100 * MB,
    filterMode: 'ext',
    mimetypes: [
      'application/pdf',
      'application/epub+zip',
      'application/x-mobipocket-ebook',
      'text/plain',
    ],
    exts: ['.pdf', '.epub', '.mobi', '.txt'],
    filenamePrefix: 'ebook-',
  },
  homework: {
    dir: 'homework',
    maxBytes: 10 * MB,
    filterMode: 'mime',
    mimetypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'application/zip',
      'application/x-rar-compressed',
    ],
    exts: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.zip', '.rar'],
    filenamePrefix: '',
  },
  'study-materials': {
    dir: 'study-materials',
    maxBytes: 25 * MB,
    filterMode: 'both',
    mimetypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png',
    ],
    exts: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png'],
    filenamePrefix: 'material-',
  },
  'placement-documents': {
    dir: 'placement-documents',
    maxBytes: 10 * MB,
    filterMode: 'ext',
    mimetypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ],
    exts: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    filenamePrefix: 'doc-',
  },
  assignments: {
    dir: 'assignments',
    maxBytes: 10 * MB,
    filterMode: 'both',
    mimetypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'application/zip',
      'application/x-rar-compressed',
    ],
    exts: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.zip', '.rar'],
    filenamePrefix: 'assignment-',
  },
};

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

class StorageError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'StorageError';
    this.code = code || 'STORAGE_ERROR';
    this.status = status || 500;
  }
}

class StorageConfigError extends StorageError {
  constructor(message) {
    super(message, 'STORAGE_CONFIG_ERROR', 503);
    this.name = 'StorageConfigError';
  }
}

function assertCategory(category) {
  if (!Object.prototype.hasOwnProperty.call(STORAGE_CATEGORIES, category)) {
    throw new StorageError(`Unsupported file category: ${category}`, 'INVALID_CATEGORY', 404);
  }
  return STORAGE_CATEGORIES[category];
}

function assertSafeFilename(filename) {
  if (typeof filename !== 'string' || !SAFE_NAME.test(filename)) {
    throw new StorageError('Invalid file key', 'INVALID_KEY', 404);
  }
  return path.basename(filename);
}

function lookupContentType(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.epub': 'application/epub+zip',
    '.mobi': 'application/x-mobipocket-ebook',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
  };
  return map[ext] || 'application/octet-stream';
}

// Maps any stored reference shape to { category, filename }:
//   /uploads/<category>/<file>, uploads/<category>/<file>,
//   bare filename (legacy Student.profilePhoto -> students),
//   or a path ending in uploads/<category>/<file> (multer absolute paths).
// Returns null when the value cannot be mapped — callers must treat it as
// "no file", never as a filesystem path.
function parseStoredRef(stored) {
  if (!stored || typeof stored !== 'string') return null;
  const clean = stored.split('?')[0].split('#')[0].replace(/\\/g, '/');
  const m = clean.match(/(?:^|\/)uploads\/([A-Za-z0-9_-]+)\/([^/]+)$/);
  if (m && Object.prototype.hasOwnProperty.call(STORAGE_CATEGORIES, m[1]) && SAFE_NAME.test(m[2])) {
    return { category: m[1], filename: m[2] };
  }
  if (SAFE_NAME.test(clean) && !clean.includes('/')) {
    return { category: 'students', filename: clean };
  }
  return null;
}

function storageKey(category, filename) {
  return `/uploads/${category}/${filename}`;
}

function getStorageConfig(env = process.env) {
  const provider = String(env.FILE_STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider !== 'local' && provider !== 'azure') {
    throw new StorageConfigError(
      `FILE_STORAGE_PROVIDER must be "local" or "azure" (got "${env.FILE_STORAGE_PROVIDER}").`
    );
  }
  const maxBytesRaw = env.STORAGE_MAX_BYTES;
  const warnBytesRaw = env.STORAGE_WARN_BYTES;
  const maxBytes = maxBytesRaw ? Number(maxBytesRaw) : DEFAULT_STORAGE_MAX_BYTES;
  const warnBytes = warnBytesRaw ? Number(warnBytesRaw) : Math.floor(maxBytes * 0.8);
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new StorageConfigError('STORAGE_MAX_BYTES must be a positive number of bytes.');
  }
  return {
    provider,
    accountName: (env.AZURE_STORAGE_ACCOUNT_NAME || '').trim(),
    containerName: (env.AZURE_STORAGE_CONTAINER || 'campushub-private').trim().toLowerCase(),
    maxBytes,
    warnBytes,
  };
}

function ensureAzureConfig(config) {
  if (!config.accountName) {
    throw new StorageConfigError(
      'FILE_STORAGE_PROVIDER=azure requires AZURE_STORAGE_ACCOUNT_NAME. ' +
        'Refusing to serve files until it is set (no silent local fallback).'
    );
  }
  if (!config.containerName || !/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/.test(config.containerName)) {
    throw new StorageConfigError(
      'AZURE_STORAGE_CONTAINER must be a valid private container name (lowercase, 3-63 chars).'
    );
  }
}

// ---------------------------------------------------------------------------
// Local provider
// ---------------------------------------------------------------------------
class LocalStorageProvider {
  constructor(root) {
    this.name = 'local';
    this.root = root || uploadRoot();
  }

  categoryDir(category) {
    const spec = assertCategory(category);
    return path.join(this.root, spec.dir);
  }

  resolvePath(category, filename) {
    const safe = assertSafeFilename(filename);
    const dir = path.resolve(this.categoryDir(category));
    const resolved = path.resolve(dir, safe);
    if (resolved !== path.join(dir, safe) || path.relative(dir, resolved).startsWith('..')) {
      throw new StorageError('Invalid file key', 'INVALID_KEY', 404);
    }
    return resolved;
  }

  // Resolve a legacy stored filepath (absolute multer path, relative path,
  // or bare filename) to an on-disk location for reads/deletes. New writes
  // always resolve via resolvePath; this keeps old records readable.
  resolveStoredPath(category, storedPath, filename) {
    if (storedPath && typeof storedPath === 'string') {
      const normalized = storedPath.replace(/\\/g, '/');
      const m = normalized.match(/(?:^|\/)uploads\/([A-Za-z0-9_-]+)\/([^/]+)$/);
      if (m && Object.prototype.hasOwnProperty.call(STORAGE_CATEGORIES, m[1])) {
        try {
          return this.resolvePath(m[1], m[2]);
        } catch (_) {
          // fall through to category/filename resolution
        }
      }
      const abs = path.isAbsolute(storedPath) ? storedPath : path.resolve(storedPath);
      const rootResolved = path.resolve(this.root);
      if (!path.relative(rootResolved, abs).startsWith('..')) return abs;
    }
    return this.resolvePath(category, filename);
  }

  async put({ category, filename, sourcePath, data, contentType }) {
    assertCategory(category);
    assertSafeFilename(filename);
    const dest = this.resolvePath(category, filename);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    const hash = crypto.createHash('sha256');
    let bytes = 0;
    if (sourcePath) {
      await new Promise((resolve, reject) => {
        const rs = fs.createReadStream(sourcePath);
        const ws = fs.createWriteStream(dest);
        rs.on('data', (c) => {
          bytes += c.length;
          hash.update(c);
        });
        rs.on('error', reject);
        ws.on('error', reject);
        ws.on('finish', resolve);
        rs.pipe(ws);
      });
    } else if (data) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      bytes = buf.length;
      hash.update(buf);
      await fsp.writeFile(dest, buf);
    } else {
      throw new StorageError('put requires sourcePath or data', 'INVALID_PUT', 500);
    }
    return {
      key: storageKey(category, filename),
      bytes,
      sha256: hash.digest('hex'),
      contentType: contentType || lookupContentType(filename),
    };
  }

  async get({ category, filename, storedPath }) {
    assertCategory(category);
    assertSafeFilename(filename);
    const resolved = this.resolveStoredPath(category, storedPath, filename);
    let stat;
    try {
      stat = await fsp.stat(resolved);
    } catch (_) {
      throw new StorageError('File not found', 'NOT_FOUND', 404);
    }
    if (!stat.isFile()) throw new StorageError('File not found', 'NOT_FOUND', 404);
    return {
      stream: fs.createReadStream(resolved),
      bytes: stat.size,
      contentType: lookupContentType(filename),
    };
  }

  async stat({ category, filename, storedPath }) {
    assertCategory(category);
    assertSafeFilename(filename);
    const resolved = this.resolveStoredPath(category, storedPath, filename);
    try {
      const st = await fsp.stat(resolved);
      if (!st.isFile()) throw new Error('not a file');
      return { bytes: st.size, contentType: lookupContentType(filename) };
    } catch (_) {
      throw new StorageError('File not found', 'NOT_FOUND', 404);
    }
  }

  async exists({ category, filename, storedPath }) {
    try {
      await this.stat({ category, filename, storedPath });
      return true;
    } catch (_) {
      return false;
    }
  }

  async delete({ category, filename, storedPath, missingOk = true }) {
    assertCategory(category);
    assertSafeFilename(filename);
    const resolved = this.resolveStoredPath(category, storedPath, filename);
    try {
      await fsp.unlink(resolved);
      return true;
    } catch (err) {
      if (err && err.code === 'ENOENT' && missingOk) return false;
      throw err;
    }
  }

  async usageByCategory() {
    const out = {};
    for (const [category, spec] of Object.entries(STORAGE_CATEGORIES)) {
      const dir = path.join(this.root, spec.dir);
      let files = 0;
      let bytes = 0;
      try {
        const entries = await fsp.readdir(dir, { withFileTypes: true });
        for (const e of entries) {
          if (!e.isFile()) continue;
          files += 1;
          try {
            bytes += (await fsp.stat(path.join(dir, e.name))).size;
          } catch (_) {}
        }
      } catch (_) {
        // missing dir == empty category
      }
      out[category] = { files, bytes };
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Azure provider (private container, managed-identity auth)
// ---------------------------------------------------------------------------
class AzureStorageProvider {
  constructor(config) {
    ensureAzureConfig(config);
    this.name = 'azure';
    this.config = config;
    this._clients = null;
  }

  _init() {
    if (this._clients) return this._clients;
    let blobPkg;
    let identityPkg;
    try {
      blobPkg = require('@azure/storage-blob');
    } catch (_) {
      throw new StorageConfigError(
        'FILE_STORAGE_PROVIDER=azure requires the @azure/storage-blob package to be installed.'
      );
    }
    try {
      identityPkg = require('@azure/identity');
    } catch (_) {
      throw new StorageConfigError(
        'FILE_STORAGE_PROVIDER=azure requires the @azure/identity package to be installed.'
      );
    }
    const { BlobServiceClient } = blobPkg;
    const { DefaultAzureCredential } = identityPkg;
    // Managed identity on the future Container App; Azure developer
    // credentials (Azure CLI / VS Code / env) for local operators.
    // No connection string or storage key is ever required or read here.
    const credential = new DefaultAzureCredential();
    const service = new BlobServiceClient(
      `https://${this.config.accountName}.blob.core.windows.net`,
      credential
    );
    const container = service.getContainerClient(this.config.containerName);
    this._clients = { service, container };
    return this._clients;
  }

  blobName(category, filename) {
    assertCategory(category);
    assertSafeFilename(filename);
    return `${category}/${filename}`;
  }

  async _requireContainer() {
    const { container } = this._init();
    let exists = false;
    try {
      exists = await container.exists();
    } catch (err) {
      throw new StorageConfigError(
        `Cannot reach Azure Blob Storage account "${this.config.accountName}" ` +
          `(${err && err.message ? err.message : err}). Check managed-identity ` +
          'role assignment (Storage Blob Data Contributor) or local developer credentials.'
      );
    }
    if (!exists) {
      throw new StorageConfigError(
        `Private container "${this.config.containerName}" does not exist in storage ` +
          `account "${this.config.accountName}". An operator must create it as a ` +
          'private container before enabling FILE_STORAGE_PROVIDER=azure. ' +
          'This adapter never creates containers or changes access levels itself.'
      );
    }
    return container;
  }

  async put({ category, filename, sourcePath, data, contentType }) {
    const container = await this._requireContainer();
    const name = this.blobName(category, filename);
    const block = container.getBlockBlobClient(name);
    const type = contentType || lookupContentType(filename);
    try {
      if (sourcePath) {
        await block.uploadFile(sourcePath, { blobHTTPHeaders: { blobContentType: type } });
        const st = await fsp.stat(sourcePath);
        return { key: storageKey(category, filename), bytes: st.size, sha256: null, contentType: type };
      }
      if (data) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        await block.uploadData(buf, { blobHTTPHeaders: { blobContentType: type } });
        return {
          key: storageKey(category, filename),
          bytes: buf.length,
          sha256: crypto.createHash('sha256').update(buf).digest('hex'),
          contentType: type,
        };
      }
    } catch (err) {
      if (err instanceof StorageConfigError) throw err;
      throw new StorageError(
        `Azure blob upload failed for ${name}: ${err && err.message ? err.message : err}`,
        'AZURE_PUT_FAILED',
        502
      );
    }
    throw new StorageError('put requires sourcePath or data', 'INVALID_PUT', 500);
  }

  async get({ category, filename }) {
    const container = await this._requireContainer();
    const name = this.blobName(category, filename);
    const blob = container.getBlobClient(name);
    let download;
    try {
      download = await blob.download();
    } catch (err) {
      if (err && (err.statusCode === 404 || err.code === 'BlobNotFound')) {
        throw new StorageError('File not found', 'NOT_FOUND', 404);
      }
      throw new StorageError(
        `Azure blob download failed for ${name}: ${err && err.message ? err.message : err}`,
        'AZURE_GET_FAILED',
        502
      );
    }
    if (!download.readableStreamBody) {
      throw new StorageError('File not found', 'NOT_FOUND', 404);
    }
    return {
      stream: download.readableStreamBody,
      bytes:
        typeof download.contentLength === 'number' ? download.contentLength : undefined,
      contentType: download.contentType || lookupContentType(filename),
    };
  }

  async stat({ category, filename }) {
    const container = await this._requireContainer();
    const name = this.blobName(category, filename);
    const blob = container.getBlobClient(name);
    try {
      const props = await blob.getProperties();
      return {
        bytes: props.contentLength,
        contentType: props.contentType || lookupContentType(filename),
        // Azure exposes an MD5 (base64) when the blob was uploaded with one;
        // SHA-256 is not returned by the service.
        contentMD5: props.contentHash ? Buffer.from(props.contentHash).toString('hex') : null,
      };
    } catch (err) {
      if (err && (err.statusCode === 404 || err.code === 'BlobNotFound')) {
        throw new StorageError('File not found', 'NOT_FOUND', 404);
      }
      throw err;
    }
  }

  async exists({ category, filename }) {
    try {
      await this.stat({ category, filename });
      return true;
    } catch (err) {
      if (err && err.code === 'NOT_FOUND') return false;
      throw err;
    }
  }

  async delete({ category, filename, missingOk = true }) {
    const container = await this._requireContainer();
    const name = this.blobName(category, filename);
    const blob = container.getBlobClient(name);
    try {
      const res = await blob.deleteIfExists();
      return !!res.succeeded;
    } catch (err) {
      if (missingOk && (err.statusCode === 404 || err.code === 'BlobNotFound')) return false;
      throw new StorageError(
        `Azure blob delete failed for ${name}: ${err && err.message ? err.message : err}`,
        'AZURE_DELETE_FAILED',
        502
      );
    }
  }

  async usageByCategory() {
    const container = await this._requireContainer();
    const out = {};
    for (const category of Object.keys(STORAGE_CATEGORIES)) out[category] = { files: 0, bytes: 0 };
    for await (const blob of container.listBlobsFlat()) {
      const slash = blob.name.indexOf('/');
      if (slash === -1) continue;
      const cat = blob.name.slice(0, slash);
      if (!Object.prototype.hasOwnProperty.call(out, cat)) continue;
      out[cat].files += 1;
      out[cat].bytes += blob.properties && blob.properties.contentLength ? blob.properties.contentLength : 0;
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Singleton + quota helpers
// ---------------------------------------------------------------------------
let _instance = null;
let _instanceKey = null;

function getStorageConfigSnapshot() {
  return getStorageConfig();
}

function getStorage(env = process.env) {
  const config = getStorageConfig(env);
  const key = `${config.provider}|${config.accountName}|${config.containerName}`;
  if (_instance && _instanceKey === key) return { storage: _instance, config };
  let storage;
  if (config.provider === 'local') {
    storage = new LocalStorageProvider();
  } else {
    storage = new AzureStorageProvider(config);
  }
  _instance = storage;
  _instanceKey = key;
  return { storage, config };
}

// Test-only: drop the cached singleton so provider switches take effect.
function resetStorage() {
  _instance = null;
  _instanceKey = null;
}

// Application-side upload guard. This is NOT an account-wide billing cap:
// it only refuses API uploads that would exceed STORAGE_MAX_BYTES (HTTP
// 413). It is not atomic (concurrent uploads can race past the cap) and it
// never reflects Azure-side billing/transaction metering.
// Call BEFORE persisting; a breach fails the upload instead of silently
// eating the free allowance.
async function assertQuotaFor(storage, config, incomingBytes) {
  const usage = await storage.usageByCategory();
  const total = Object.values(usage).reduce((s, c) => s + c.bytes, 0);
  if (total + (incomingBytes || 0) > config.maxBytes) {
    throw new StorageError(
      `Storage quota exceeded: ${(total / GB).toFixed(2)} GiB stored, ` +
        `application limit ${(config.maxBytes / GB).toFixed(2)} GiB. ` +
        'This is an application-side upload guard, not an account-wide ' +
        'billing cap: delete unused files or raise STORAGE_MAX_BYTES ' +
        'deliberately. Monitor Azure Cost Management for transaction/egress ' +
        'usage; nothing here auto-upgrades the account.',
      'STORAGE_QUOTA_EXCEEDED',
      413
    );
  }
  return { usage, total, warning: total + (incomingBytes || 0) > config.warnBytes };
}

async function getUsageSummary(storage, config) {
  const usage = await storage.usageByCategory();
  const total = Object.values(usage).reduce((s, c) => s + c.bytes, 0);
  return {
    provider: storage.name,
    container: storage.name === 'azure' ? config.containerName : null,
    totalBytes: total,
    maxBytes: config.maxBytes,
    warnBytes: config.warnBytes,
    warning: total > config.warnBytes,
    exceeded: total > config.maxBytes,
    byCategory: usage,
    note:
      'Application-side accounting only (bytes stored). It does not cap or ' +
      'report Azure billing, transaction counts, or egress. If the ' +
      '4,000,000,000-byte application guard is exceeded, uploads fail with ' +
      '413 and the operator must free space or deliberately raise ' +
      'STORAGE_MAX_BYTES — nothing here upgrades the account automatically.',
  };
}

// Persist one multer-staged temp file through the adapter:
// generate final name -> quota check -> put -> delete staging temp.
// Throws honestly on failure; the caller must NOT write a DB record.
async function persistStagedFile(storage, config, { category, stagedPath, originalName, mimetype }) {
  const spec = assertCategory(category);
  const ext = path.extname(String(originalName || '')).toLowerCase();
  const unique = crypto.randomBytes(16).toString('hex');
  const filename = `${spec.filenamePrefix}${unique}${ext}`;
  assertSafeFilename(filename);
  let stagedStat = null;
  try {
    stagedStat = await fsp.stat(stagedPath);
  } catch (_) {
    throw new StorageError('Uploaded temp file is missing', 'STAGED_FILE_MISSING', 500);
  }
  await assertQuotaFor(storage, config, stagedStat.size);
  let receipt;
  try {
    receipt = await storage.put({
      category,
      filename,
      sourcePath: stagedPath,
      contentType: mimetype || lookupContentType(filename),
    });
  } finally {
    try {
      await fsp.unlink(stagedPath);
    } catch (_) {}
  }
  return {
    filename,
    key: storageKey(category, filename),
    size: receipt.bytes,
    sha256: receipt.sha256 || null,
    mimetype: mimetype || lookupContentType(filename),
    originalName: originalName || filename,
  };
}

// Persist N staged files; on any failure, delete already-persisted objects
// so a partial upload never leaves orphaned blobs behind, then rethrow.
async function persistStagedFiles(storage, config, items) {
  const done = [];
  try {
    for (const item of items) {
      const saved = await persistStagedFile(storage, config, item);
      done.push(saved);
    }
    return done;
  } catch (err) {
    for (const saved of done) {
      const ref = parseStoredRef(saved.key);
      if (ref) {
        try {
          await storage.delete({ category: ref.category, filename: ref.filename });
        } catch (_) {}
      }
    }
    throw err;
  }
}

function discardStagedFiles(files) {
  for (const f of files || []) {
    const p = typeof f === 'string' ? f : f && f.path;
    if (p) fsp.unlink(p).catch(() => {});
  }
}

module.exports = {
  UPLOAD_ROOT,
  DEFAULT_STORAGE_MAX_BYTES,
  STAGING_DIR,
  uploadRoot,
  stagingDir,
  STORAGE_CATEGORIES,
  SAFE_NAME,
  StorageError,
  StorageConfigError,
  assertCategory,
  assertSafeFilename,
  lookupContentType,
  parseStoredRef,
  storageKey,
  getStorageConfig,
  ensureAzureConfig,
  LocalStorageProvider,
  AzureStorageProvider,
  getStorage,
  getStorageConfigSnapshot,
  resetStorage,
  assertQuotaFor,
  getUsageSummary,
  persistStagedFile,
  persistStagedFiles,
  discardStagedFiles,
};
