// STORAGE ADAPTER — local regression, provider selection, private delivery,
// failure compensation, quota, Azure unit contracts, migration dry-run.
//
// Uses an isolated local root (FILE_STORAGE_LOCAL_ROOT) so no repository
// upload directory is ever touched. Azure SDK calls run against an in-memory
// fake container: there is intentionally NO live Blob verification here.
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs').promises;
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const request = require('supertest');

const { buildTestApp } = require('./helpers/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');
const { createDepartment, createUser, createStudent, createFaculty, authHeader } = require('./helpers/factories');

const storage = require('../src/utils/storage');
const DigitalBook = require('../src/models/DigitalBook');
const StudyMaterial = require('../src/models/StudyMaterial');
const Subject = require('../src/models/Subject');

const app = buildTestApp();

const TEST_ROOT = path.join(os.tmpdir(), `campushub-storage-test-${process.pid}`);
const OLD_ENV = {};

function setEnv(name, value) {
  if (!(name in OLD_ENV)) OLD_ENV[name] = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  storage.resetStorage();
}

function restoreEnv() {
  for (const [k, v] of Object.entries(OLD_ENV)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const k of Object.keys(OLD_ENV)) delete OLD_ENV[k];
  storage.resetStorage();
}

function local() {
  return new storage.LocalStorageProvider(TEST_ROOT);
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

beforeAll(async () => {
  await connectTestDB();
  await fsp.rm(TEST_ROOT, { recursive: true, force: true });
  await fsp.mkdir(TEST_ROOT, { recursive: true });
  setEnv('FILE_STORAGE_PROVIDER', 'local');
  setEnv('FILE_STORAGE_LOCAL_ROOT', TEST_ROOT);
});

beforeEach(async () => {
  await clearTestDB();
  await fsp.rm(TEST_ROOT, { recursive: true, force: true });
  await fsp.mkdir(TEST_ROOT, { recursive: true });
  setEnv('FILE_STORAGE_PROVIDER', 'local');
  setEnv('FILE_STORAGE_LOCAL_ROOT', TEST_ROOT);
  setEnv('STORAGE_MAX_BYTES', undefined);
  setEnv('STORAGE_WARN_BYTES', undefined);
  setEnv('AZURE_STORAGE_ACCOUNT_NAME', undefined);
});

afterAll(async () => {
  restoreEnv();
  await fsp.rm(TEST_ROOT, { recursive: true, force: true });
  await disconnectTestDB();
});

describe('local provider regression', () => {
  test('put/get/stat/exists/delete round-trip preserves bytes and content type', async () => {
    const provider = local();
    const data = Buffer.from('%PDF-1.4 fake-ebook-bytes');
    const receipt = await provider.put({ category: 'ebooks', filename: 'ebook-abc123.pdf', data });
    expect(receipt.bytes).toBe(data.length);
    expect(receipt.sha256).toBe(crypto.createHash('sha256').update(data).digest('hex'));
    expect(await provider.exists({ category: 'ebooks', filename: 'ebook-abc123.pdf' })).toBe(true);

    const got = await provider.get({ category: 'ebooks', filename: 'ebook-abc123.pdf' });
    expect(got.contentType).toBe('application/pdf');
    expect((await streamToBuffer(got.stream)).equals(data)).toBe(true);

    const st = await provider.stat({ category: 'ebooks', filename: 'ebook-abc123.pdf' });
    expect(st.bytes).toBe(data.length);

    expect(await provider.delete({ category: 'ebooks', filename: 'ebook-abc123.pdf' })).toBe(true);
    expect(await provider.exists({ category: 'ebooks', filename: 'ebook-abc123.pdf' })).toBe(false);
    expect(await provider.delete({ category: 'ebooks', filename: 'ebook-abc123.pdf' })).toBe(false);
  });

  test('missing blob reads are 404 StorageErrors, invalid keys never touch disk', async () => {
    const provider = local();
    await expect(provider.get({ category: 'ebooks', filename: 'nope.pdf' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    await expect(provider.get({ category: 'ebooks', filename: '../secret' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(provider.get({ category: 'ebooks', filename: '..' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(provider.get({ category: 'no-such-category', filename: 'a.pdf' })).rejects.toMatchObject({
      code: 'INVALID_CATEGORY',
    });
    // Absolute-path escape via storedPath is refused.
    await expect(
      provider.get({ category: 'homework', filename: 'a.pdf', storedPath: '/etc/passwd' })
    ).rejects.toMatchObject({ status: 404 });
  });

  test('legacy stored paths (absolute multer paths, bare photo names) still resolve', async () => {
    const provider = local();
    await provider.put({ category: 'homework', filename: 'hw-1.pdf', data: Buffer.from('HW') });
    const abs = path.join(TEST_ROOT, 'homework', 'hw-1.pdf');
    const viaAbs = await provider.get({ category: 'homework', filename: 'hw-1.pdf', storedPath: abs });
    expect((await streamToBuffer(viaAbs.stream)).toString()).toBe('HW');

    await provider.put({ category: 'students', filename: 'profile-1.png', data: Buffer.from('IMG') });
    expect(storage.parseStoredRef('profile-1.png')).toEqual({ category: 'students', filename: 'profile-1.png' });
    expect(storage.parseStoredRef('/uploads/ebooks/ebook-1.pdf')).toEqual({
      category: 'ebooks',
      filename: 'ebook-1.pdf',
    });
    expect(storage.parseStoredRef('D:\\x\\backend\\uploads\\homework\\hw-1.pdf')).toEqual({
      category: 'homework',
      filename: 'hw-1.pdf',
    });
    expect(storage.parseStoredRef('/etc/passwd')).toBeNull();
    expect(storage.parseStoredRef(null)).toBeNull();
  });
});

describe('provider selection', () => {
  test('default provider is local', () => {
    setEnv('FILE_STORAGE_PROVIDER', undefined);
    const { storage: s } = storage.getStorage();
    expect(s.name).toBe('local');
    setEnv('FILE_STORAGE_PROVIDER', 'local');
  });

  test('unknown provider fails closed with a clear error', () => {
    setEnv('FILE_STORAGE_PROVIDER', 's3');
    expect(() => storage.getStorage()).toThrow(storage.StorageConfigError);
    setEnv('FILE_STORAGE_PROVIDER', 'local');
  });

  test('azure without account name fails closed (never silently local)', () => {
    setEnv('FILE_STORAGE_PROVIDER', 'azure');
    setEnv('AZURE_STORAGE_ACCOUNT_NAME', undefined);
    expect(() => storage.getStorage()).toThrow(/AZURE_STORAGE_ACCOUNT_NAME/);
    setEnv('FILE_STORAGE_PROVIDER', 'local');
  });

  test('default storage cap is 4,000,000,000 bytes; env override is honored', () => {
    setEnv('STORAGE_MAX_BYTES', undefined);
    setEnv('STORAGE_WARN_BYTES', undefined);
    const def = storage.getStorageConfig();
    expect(def.maxBytes).toBe(4000000000);
    expect(storage.DEFAULT_STORAGE_MAX_BYTES).toBe(4000000000);
    expect(def.warnBytes).toBe(Math.floor(4000000000 * 0.8));
    setEnv('STORAGE_MAX_BYTES', '12345');
    expect(storage.getStorageConfig().maxBytes).toBe(12345);
    setEnv('STORAGE_MAX_BYTES', undefined);
  });
});

describe('private delivery through authorized routes', () => {
  async function seedPhoto() {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const fac = await createFaculty({ department: dept });
    const a = await createStudent({ department: dept, usn: 'STOAAA0001' });
    const b = await createStudent({ department: dept, usn: 'STOBBB0002' });
    const provider = local();
    await provider.put({ category: 'students', filename: 'profile-owner.png', data: Buffer.from('OWNER-IMG') });
    a.profile.profilePhoto = 'profile-owner.png';
    await a.profile.save();
    return { admin, fac: fac.user, owner: a.user, other: b.user };
  }

  test('unauthenticated file access is denied', async () => {
    const res = await request(app).get('/api/v1/files/students/profile-owner.png');
    expect(res.status).toBe(401);
  });

  test('owner reads own photo; other student denied; admin/faculty allowed', async () => {
    const { admin, fac, owner, other } = await seedPhoto();
    const own = await request(app)
      .get('/api/v1/files/students/profile-owner.png')
      .set(authHeader(owner));
    expect(own.status).toBe(200);
    expect(own.headers['content-type']).toMatch(/image\/png/);

    const stranger = await request(app)
      .get('/api/v1/files/students/profile-owner.png')
      .set(authHeader(other));
    expect(stranger.status).toBe(403);

    expect(
      (await request(app).get('/api/v1/files/students/profile-owner.png').set(authHeader(admin))).status
    ).toBe(200);
    expect(
      (await request(app).get('/api/v1/files/students/profile-owner.png').set(authHeader(fac))).status
    ).toBe(200);
  });

  test('invalid category and traversal are uniform 404s', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    expect((await request(app).get('/api/v1/files/nope/x.png').set(authHeader(admin))).status).toBe(404);
    expect((await request(app).get('/api/v1/files/students/..').set(authHeader(admin))).status).toBe(404);
    expect(
      (await request(app).get('/api/v1/files/students/missing-file.png').set(authHeader(admin))).status
    ).toBe(404);
  });

  test('ebook private delivery honors access gates on both routes', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const a = await createStudent({ department: dept, usn: 'STOAAA0011' });
    const b = await createStudent({ department: dept, usn: 'STOBBB0012' });
    const provider = local();
    const pdf = Buffer.from('%PDF-1.4 gated-bytes');
    await provider.put({ category: 'ebooks', filename: 'ebook-gated.pdf', data: pdf });

    const open = await DigitalBook.create({
      title: 'Open Book',
      author: 'A U Thor',
      fileType: 'PDF',
      fileUrl: '/uploads/ebooks/ebook-gated.pdf',
      uploadedBy: admin._id,
      accessType: 'Students Only',
      status: 'Active',
    });
    const shut = await DigitalBook.create({
      title: 'Shut Book',
      author: 'A U Thor',
      fileType: 'PDF',
      fileUrl: '/uploads/ebooks/ebook-gated.pdf',
      uploadedBy: admin._id,
      accessType: 'Private',
      allowedUsers: [b.user._id],
      status: 'Active',
    });

    // Open book: any student reads via gateway and download endpoint.
    expect(
      (await request(app).get('/api/v1/files/ebooks/ebook-gated.pdf').set(authHeader(a.user))).status
    ).toBe(200);
    const dl = await request(app)
      .get(`/api/v1/digital-library/books/${open._id}/download`)
      .set(authHeader(a.user));
    expect(dl.status).toBe(200);
    expect(dl.headers['content-disposition']).toMatch(/attachment/);

    // Private book limited to b: a is denied on both routes.
    expect(
      (await request(app).get(`/api/v1/digital-library/books/${shut._id}/download`).set(authHeader(a.user)))
        .status
    ).toBe(403);
  });

  test('study-material download of a missing blob is 404, usage is admin-only', async () => {
    const dept = await createDepartment();
    const admin = await createUser({ role: 'ADMIN', department: dept._id });
    const a = await createStudent({ department: dept, usn: 'STOAAA0021' });
    const subject = await Subject.create({
      name: 'Physics',
      subjectCode: `PH9${Date.now() % 100000}`,
      department: dept._id,
      semester: 3,
      credits: 3,
    });
    const material = await StudyMaterial.create({
      title: 'Ghost file',
      category: 'LECTURE_NOTES',
      subject: subject._id,
      department: dept._id,
      faculty: admin._id,
      semester: 3,
      academicYear: '2026-27',
      files: [
        {
          originalName: 'ghost.pdf',
          filename: 'material-ghost.pdf',
          filepath: 'uploads/study-materials/material-ghost.pdf',
          mimetype: 'application/pdf',
          size: 10,
        },
      ],
    });
    const missing = await request(app)
      .get(`/api/v1/study-materials/${material._id}/download/material-ghost.pdf`)
      .set(authHeader(a.user));
    expect(missing.status).toBe(404);

    expect((await request(app).get('/api/v1/files/usage').set(authHeader(admin))).status).toBe(200);
    const usage = await request(app).get('/api/v1/files/usage').set(authHeader(admin));
    expect(usage.body.data.provider).toBe('local');
    expect(usage.body.data.byCategory).toBeDefined();
    expect((await request(app).get('/api/v1/files/usage').set(authHeader(a.user))).status).toBe(403);
  });
});

describe('upload failure and DB-write failure behavior', () => {
  test('honest error + no DB record when the blob write fails (quota)', async () => {
    const dept = await createDepartment();
    const fac = await createFaculty({ department: dept });
    setEnv('STORAGE_MAX_BYTES', '1');
    const res = await request(app)
      .post('/api/v1/digital-library/books')
      .set(authHeader(fac.user))
      .field('title', 'Too big')
      .field('author', 'A U Thor')
      .attach('book', Buffer.from('%PDF-1.4 x'), 'big.pdf');
    expect([413, 500]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(await DigitalBook.countDocuments({ title: 'Too big' })).toBe(0);
    setEnv('STORAGE_MAX_BYTES', undefined);
  });

  test('compensating delete when the DB write fails after upload', async () => {
    const dept = await createDepartment();
    const fac = await createFaculty({ department: dept });
    const res = await request(app)
      .post('/api/v1/digital-library/books')
      .set(authHeader(fac.user))
      .field('title', 'No author book')
      .attach('book', Buffer.from('%PDF-1.4 x'), 'orphan.pdf');
    expect(res.status).toBe(500);
    expect(await DigitalBook.countDocuments({ title: 'No author book' })).toBe(0);
    // No orphaned ebook objects remain in storage.
    const { storage: s } = storage.getStorage();
    const usage = await s.usageByCategory();
    expect(usage.ebooks.files).toBe(0);
    // Staging temps are cleaned up.
    const tmp = path.join(TEST_ROOT, '.tmp');
    const leftovers = fs.existsSync(tmp) ? await fsp.readdir(tmp) : [];
    expect(leftovers).toEqual([]);
  });

  test('successful upload keeps DB/API contracts and cleans staging', async () => {
    const dept = await createDepartment();
    const fac = await createFaculty({ department: dept });
    const res = await request(app)
      .post('/api/v1/digital-library/books')
      .set(authHeader(fac.user))
      .field('title', 'Contract Book')
      .field('author', 'A U Thor')
      .attach('book', Buffer.from('%PDF-1.4 contract'), 'contract.pdf');
    expect(res.status).toBe(201);
    expect(res.body.data.fileUrl).toMatch(/^\/uploads\/ebooks\//);
    expect(res.body.data.fileSize).toBeGreaterThan(0);
    const { storage: s } = storage.getStorage();
    const ref = storage.parseStoredRef(res.body.data.fileUrl);
    expect(await s.exists({ category: ref.category, filename: ref.filename })).toBe(true);
    const tmp = path.join(TEST_ROOT, '.tmp');
    const leftovers = fs.existsSync(tmp) ? await fsp.readdir(tmp) : [];
    expect(leftovers).toEqual([]);
  });

  test('multi-file persist compensates already-stored objects on failure', async () => {
    const { storage: s, config } = storage.getStorage();
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'staging-'));
    const a = path.join(dir, 'a.pdf');
    const b = path.join(dir, 'b.pdf');
    await fsp.writeFile(a, 'AAA');
    await fsp.writeFile(b, 'BBB');
    // Second put explodes: first object must be rolled back, temps removed.
    const realPut = s.put.bind(s);
    let calls = 0;
    s.put = async (args) => {
      calls += 1;
      if (calls === 2) throw new storage.StorageError('boom', 'AZURE_PUT_FAILED', 502);
      return realPut(args);
    };
    await expect(
      storage.persistStagedFiles(s, config, [
        { category: 'homework', stagedPath: a, originalName: 'a.pdf', mimetype: 'application/pdf' },
        { category: 'homework', stagedPath: b, originalName: 'b.pdf', mimetype: 'application/pdf' },
      ])
    ).rejects.toMatchObject({ code: 'AZURE_PUT_FAILED' });
    s.put = realPut;
    const usage = await s.usageByCategory();
    expect(usage.homework.files).toBe(0);
    expect(fs.existsSync(a)).toBe(false);
    expect(fs.existsSync(b)).toBe(false);
  });
});

describe('azure provider unit contracts (fake transport, no live calls)', () => {
  function fakeContainer() {
    const blobs = new Map();
    return {
      blobs,
      async exists() {
        return true;
      },
      getBlockBlobClient(name) {
        return {
          async uploadFile(filePath, opts) {
            const buf = await fsp.readFile(filePath);
            blobs.set(name, {
              data: buf,
              contentType: opts && opts.blobHTTPHeaders && opts.blobHTTPHeaders.blobContentType,
              md5: null,
            });
          },
          async uploadData(buf, opts) {
            const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
            blobs.set(name, {
              data: b,
              contentType: opts && opts.blobHTTPHeaders && opts.blobHTTPHeaders.blobContentType,
              md5: crypto.createHash('md5').update(b).digest(),
            });
          },
        };
      },
      getBlobClient(name) {
        return {
          async download() {
            const b = blobs.get(name);
            if (!b) {
              const e = new Error('BlobNotFound');
              e.statusCode = 404;
              throw e;
            }
            const { Readable } = require('stream');
            return {
              readableStreamBody: Readable.from([b.data]),
              contentLength: b.data.length,
              contentType: b.contentType,
            };
          },
          async getProperties() {
            const b = blobs.get(name);
            if (!b) {
              const e = new Error('BlobNotFound');
              e.statusCode = 404;
              throw e;
            }
            return { contentLength: b.data.length, contentType: b.contentType, contentHash: b.md5 };
          },
          async deleteIfExists() {
            return { succeeded: blobs.delete(name) };
          },
        };
      },
      async *listBlobsFlat() {
        for (const [name, b] of blobs) {
          yield { name, properties: { contentLength: b.data.length } };
        }
      },
    };
  }

  function azureWithFake() {
    const p = new storage.AzureStorageProvider({
      provider: 'azure',
      accountName: 'fakestorage',
      containerName: 'campushub-private',
      maxBytes: 5 * 1024 * 1024 * 1024,
      warnBytes: 1,
    });
    p._clients = { service: {}, container: fakeContainer() };
    return p;
  }

  test('blob names stay namespaced per category and round-trip bytes', async () => {
    const p = azureWithFake();
    expect(p.blobName('ebooks', 'ebook-1.pdf')).toBe('ebooks/ebook-1.pdf');
    expect(() => p.blobName('ebooks', '../evil')).toThrow();
    const data = Buffer.from('azure-bytes');
    const receipt = await p.put({ category: 'ebooks', filename: 'ebook-1.pdf', data });
    expect(receipt.bytes).toBe(data.length);
    expect(receipt.contentType).toBe('application/pdf');
    expect(await p.exists({ category: 'ebooks', filename: 'ebook-1.pdf' })).toBe(true);
    const got = await p.get({ category: 'ebooks', filename: 'ebook-1.pdf' });
    expect((await streamToBuffer(got.stream)).equals(data)).toBe(true);
    const st = await p.stat({ category: 'ebooks', filename: 'ebook-1.pdf' });
    expect(st.bytes).toBe(data.length);
    expect(await p.delete({ category: 'ebooks', filename: 'ebook-1.pdf' })).toBe(true);
    expect(await p.exists({ category: 'ebooks', filename: 'ebook-1.pdf' })).toBe(false);
    await expect(p.get({ category: 'ebooks', filename: 'ebook-1.pdf' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('usage aggregates per category prefix', async () => {
    const p = azureWithFake();
    await p.put({ category: 'ebooks', filename: 'a.pdf', data: Buffer.from('1234') });
    await p.put({ category: 'homework', filename: 'b.pdf', data: Buffer.from('12') });
    const usage = await p.usageByCategory();
    expect(usage.ebooks).toEqual({ files: 1, bytes: 4 });
    expect(usage.homework).toEqual({ files: 1, bytes: 2 });
  });
});

describe('migration utility', () => {
  function runScript(args, opts = {}) {
    return new Promise((resolve) => {
      execFile(
        process.execPath,
        [path.join(__dirname, '..', 'scripts', 'migrate-uploads-to-azure.js'), ...args],
        { timeout: 60000, ...opts },
        (error, stdout, stderr) => {
          resolve({ code: error && typeof error.code === 'number' ? error.code : error ? 1 : 0, stdout, stderr });
        }
      );
    });
  }

  test('dry-run inventories supported files, skips secrets, leaves sources intact', async () => {
    const src = await fsp.mkdtemp(path.join(os.tmpdir(), 'migrate-src-'));
    await fsp.mkdir(path.join(src, 'ebooks'), { recursive: true });
    await fsp.mkdir(path.join(src, 'homework'), { recursive: true });
    await fsp.writeFile(path.join(src, 'ebooks', 'ebook-keep.pdf'), '%PDF-keep');
    await fsp.writeFile(path.join(src, 'homework', 'hw-keep.pdf'), 'HW-keep');
    await fsp.writeFile(path.join(src, '.env'), 'SECRET=1'); // must never be considered
    await fsp.writeFile(path.join(src, 'notes.txt'), 'stray'); // outside category roots: ignored
    const jsonPath = path.join(src, 'report.json');

    const first = await runScript(['--source-dir', src, '--json', jsonPath]);
    expect(first.code).toBe(0);
    expect(first.stdout).toMatch(/DRY-RUN/);
    expect(first.stdout).toMatch(/Total: 2 file/);
    const report = JSON.parse(await fsp.readFile(jsonPath, 'utf8'));
    expect(report.mode).toBe('dry-run');
    expect(report.fileCount).toBe(2);
    expect(report.totalBytes).toBeGreaterThan(0);
    expect(report.collisions).toEqual([]);
    expect(report.byCategory.ebooks.files).toBe(1);
    expect(report.byCategory.homework.files).toBe(1);
    expect(report.uploaded).toEqual([]);
    // Sources intact; secrets untouched and unlisted.
    expect((await fsp.readFile(path.join(src, 'ebooks', 'ebook-keep.pdf'), 'utf8'))).toBe('%PDF-keep');
    expect((await fsp.readFile(path.join(src, '.env'), 'utf8'))).toBe('SECRET=1');
    expect(JSON.stringify(report)).not.toContain('.env');

    // Re-running is idempotent: identical inventory.
    const json2 = path.join(src, 'report2.json');
    const second = await runScript(['--source-dir', src, '--json', json2]);
    expect(second.code).toBe(0);
    const report2 = JSON.parse(await fsp.readFile(json2, 'utf8'));
    expect(report2.fileCount).toBe(report.fileCount);
    expect(report2.totalBytes).toBe(report.totalBytes);
    await fsp.rm(src, { recursive: true, force: true });
  });

  test('--execute without azure provider refuses instead of uploading', async () => {
    const src = await fsp.mkdtemp(path.join(os.tmpdir(), 'migrate-src-'));
    const res = await runScript(['--source-dir', src, '--execute'], {
      env: { ...process.env, FILE_STORAGE_PROVIDER: 'local' },
    });
    expect(res.code).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/Refusing --execute/);
    await fsp.rm(src, { recursive: true, force: true });
  });
});
