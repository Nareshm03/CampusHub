#!/usr/bin/env node
// CampusHub local-uploads -> Azure Blob Storage migration utility.
//
// SAFE BY DEFAULT: without --execute this is a read-only inventory
// (--dry-run is the default). Nothing is uploaded, deleted, or rewritten.
//
//   node scripts/migrate-uploads-to-azure.js --source-dir ./uploads [--execute]
//
// Options:
//   --source-dir <dir>   Local uploads root to inventory (default: <backend>/uploads).
//                        Only files inside the KNOWN category subdirectories
//                        (students, book-covers, company-logos, ebooks,
//                        homework, study-materials, placement-documents,
//                        assignments) are ever considered. .env files,
//                        credentials, logs, source code, staging temps
//                        (uploads/.tmp), and anything outside those roots are
//                        NEVER uploaded.
//   --execute            Actually upload to Azure. Requires AZURE_STORAGE_ACCOUNT_NAME
//                        (+ optional AZURE_STORAGE_CONTAINER) and working
//                        DefaultAzureCredential auth (managed identity on
//                        Azure; Azure CLI login for operators).
//   --mongo-uri <uri>    Also inventory live database file references and
//                        report which referenced files are MISSING on disk.
//                        Without it, only the filesystem is inventoried.
//   --json <path>        Write the full machine-readable report to <path>.
//
// Guarantees:
//   - Idempotent: re-running --execute skips blobs that already exist with
//     the same size (and same MD5 when the service returns one); only new or
//     changed files are uploaded.
//   - Verified: every upload is followed by a server-side stat; size must
//     match, and MD5 is compared when Azure returns a content hash. Local
//     SHA-256 is recorded in the report for every file (Azure Blob Storage
//     does not store SHA-256, so post-hoc verification uses size + MD5).
//   - Source files are NEVER deleted or modified by this tool.
//   - Production database records are NEVER rewritten by this tool.
//
// Render production files: this repo checkout does NOT contain Render's live
// uploads (Render disks are ephemeral per deploy and not in git). Transferring
// them is a separate operational prerequisite — see the footer of the report.
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const {
  STORAGE_CATEGORIES,
  SAFE_NAME,
  AzureStorageProvider,
  getStorageConfig,
} = require('../src/utils/storage');

function parseArgs(argv) {
  const out = {
    sourceDir: path.join(__dirname, '..', 'uploads'),
    execute: false,
    mongoUri: process.env.MONGODB_URI || '',
    json: '',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--execute') out.execute = true;
    else if (a === '--dry-run') out.execute = false;
    else if (a === '--source-dir') out.sourceDir = argv[(i += 1)];
    else if (a === '--mongo-uri') out.mongoUri = argv[(i += 1)];
    else if (a === '--json') out.json = argv[(i += 1)];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/migrate-uploads-to-azure.js --source-dir <dir> [--execute] [--mongo-uri <uri>] [--json <path>]');
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function hashFile(filePath, algo) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algo);
    const rs = fs.createReadStream(filePath);
    rs.on('data', (c) => h.update(c));
    rs.on('error', reject);
    rs.on('end', () => resolve(h.digest('hex')));
  });
}

// Filesystem inventory: known category dirs only, no dotfiles/dirs, safe names only.
async function inventoryFilesystem(sourceDir) {
  const files = [];
  const skipped = [];
  for (const [category, spec] of Object.entries(STORAGE_CATEGORIES)) {
    const dir = path.join(sourceDir, spec.dir);
    let entries = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (_) {
      continue; // missing category dir == nothing to migrate
    }
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (e.name.startsWith('.')) {
        skipped.push({ category, file: e.name, reason: 'dotfile' });
        continue;
      }
      if (!SAFE_NAME.test(e.name)) {
        skipped.push({ category, file: e.name, reason: 'unsafe-name' });
        continue;
      }
      const full = path.join(dir, e.name);
      const stat = await fsp.stat(full);
      files.push({
        category,
        filename: e.name,
        localPath: full,
        destKey: `/uploads/${category}/${e.name}`,
        blobName: `${category}/${e.name}`,
        bytes: stat.size,
        sha256: await hashFile(full, 'sha256'),
        md5: await hashFile(full, 'md5'),
      });
    }
  }
  return { files, skipped };
}

// Database reference inventory (optional). Reads ONLY; never writes.
async function inventoryDatabase(mongoUri) {
  const mongoose = require('mongoose');
  const refs = [];
  const seen = new Set();
  const push = (collection, id, field, value) => {
    if (typeof value !== 'string' || !value) return;
    const key = `${collection}:${String(id)}:${field}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ collection, id: String(id), field, value });
  };

  await mongoose.connect(mongoUri);
  try {
    const db = mongoose.connection.db;
    const findAll = (name, proj) => db.collection(name).find({}).project(proj).toArray();

    for (const d of await findAll('digitalbooks', { fileUrl: 1, coverImage: 1 })) {
      push('digitalbooks', d._id, 'fileUrl', d.fileUrl);
      push('digitalbooks', d._id, 'coverImage', d.coverImage);
    }
    for (const d of await findAll('students', { profilePhoto: 1 })) {
      push('students', d._id, 'profilePhoto', d.profilePhoto);
    }
    for (const d of await findAll('companies', { logo: 1 })) {
      push('companies', d._id, 'logo', d.logo);
    }
    for (const d of await findAll('jobpostings', { applications: 1 })) {
      for (const app of d.applications || []) {
        push('jobpostings', d._id, 'applications.resume', app.resume);
        push('jobpostings', d._id, 'applications.coverLetter', app.coverLetter);
        for (const doc of app.documents || []) push('jobpostings', d._id, 'applications.documents.url', doc.url);
      }
    }
    for (const d of await findAll('homework', { attachments: 1 })) {
      for (const a of d.attachments || []) push('homework', d._id, 'attachments.path', a.path);
    }
    for (const d of await findAll('submissions', { files: 1 })) {
      for (const f of d.files || []) push('submissions', d._id, 'files.path', f.path);
    }
    for (const d of await findAll('studymaterials', { files: 1 })) {
      for (const f of d.files || []) push('studymaterials', d._id, 'files.filepath', f.filepath);
    }
    for (const d of await findAll('assignments', { attachments: 1 })) {
      for (const a of d.attachments || []) push('assignments', d._id, 'attachments.filepath', a.filepath);
    }
    for (const d of await findAll('assignmentsubmissions', { files: 1 })) {
      for (const f of d.files || []) push('assignmentsubmissions', d._id, 'files.filepath', f.filepath);
    }
  } finally {
    await mongoose.disconnect();
  }
  return refs;
}

function resolveRefToDisk(ref, sourceDir) {
  const { parseStoredRef } = require('../src/utils/storage');
  const parsed = parseStoredRef(ref.value);
  if (parsed) {
    const spec = STORAGE_CATEGORIES[parsed.category];
    return path.join(sourceDir, spec.dir, parsed.filename);
  }
  // Legacy absolute multer path: accept only if it resolves INSIDE sourceDir.
  const abs = path.isAbsolute(ref.value) ? ref.value : path.resolve(sourceDir, ref.value);
  const root = path.resolve(sourceDir);
  if (!path.relative(root, abs).startsWith('..')) return abs;
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const sourceDir = path.resolve(args.sourceDir);
  console.log(`CampusHub uploads migration — mode: ${args.execute ? 'EXECUTE' : 'DRY-RUN (no changes)'}`);
  console.log(`Source: ${sourceDir}`);

  const { files, skipped } = await inventoryFilesystem(sourceDir);
  const totalBytes = files.reduce((s, f) => s + f.bytes, 0);
  const byCategory = {};
  for (const f of files) {
    byCategory[f.category] = byCategory[f.category] || { files: 0, bytes: 0 };
    byCategory[f.category].files += 1;
    byCategory[f.category].bytes += f.bytes;
  }

  // Collision check: two different contents under one destination key cannot
  // happen from a single source tree (keys are 1:1 with paths), but the same
  // filename in a category dir listed twice would — guard anyway.
  const keyCounts = new Map();
  for (const f of files) keyCounts.set(f.blobName, (keyCounts.get(f.blobName) || 0) + 1);
  const collisions = [...keyCounts.entries()].filter(([, n]) => n > 1).map(([k]) => k);

  let dbRefs = [];
  let missing = [];
  if (args.mongoUri) {
    console.log('Scanning database references…');
    dbRefs = await inventoryDatabase(args.mongoUri);
    for (const ref of dbRefs) {
      const disk = resolveRefToDisk(ref, sourceDir);
      if (!disk) {
        missing.push({ ...ref, reason: 'unresolvable-reference' });
        continue;
      }
      try {
        const st = await fsp.stat(disk);
        if (!st.isFile()) throw new Error('not a file');
      } catch (_) {
        missing.push({ ...ref, reason: 'file-not-on-disk' });
      }
    }
  }

  const report = {
    mode: args.execute ? 'execute' : 'dry-run',
    sourceDir,
    fileCount: files.length,
    totalBytes,
    byCategory,
    collisions,
    skipped,
    dbRefCount: dbRefs.length,
    missing,
    uploaded: [],
    skippedPresent: [],
    failed: [],
  };

  if (args.execute) {
    const config = getStorageConfig();
    if (config.provider !== 'azure') {
      console.error(
        'Refusing --execute: FILE_STORAGE_PROVIDER is not "azure". ' +
          'Set FILE_STORAGE_PROVIDER=azure with AZURE_STORAGE_ACCOUNT_NAME to migrate.'
      );
      process.exit(2);
    }
    const azure = new AzureStorageProvider(config);
    const container = await azure._requireContainer();
    for (const f of files) {
      const blob = container.getBlobClient(f.blobName);
      try {
        let props = null;
        try {
          props = await blob.getProperties();
        } catch (e) {
          if (!(e && (e.statusCode === 404 || e.code === 'BlobNotFound'))) throw e;
        }
        if (props) {
          const sameSize = props.contentLength === f.bytes;
          const remoteMd5 = props.contentHash ? Buffer.from(props.contentHash).toString('hex') : null;
          if (sameSize && (!remoteMd5 || remoteMd5 === f.md5)) {
            report.skippedPresent.push(f.blobName);
            continue; // idempotent skip
          }
        }
        const block = container.getBlockBlobClient(f.blobName);
        await block.uploadFile(f.localPath, {
          blobHTTPHeaders: { blobContentType: require('../src/utils/storage').lookupContentType(f.filename) },
        });
        const after = await blob.getProperties();
        if (after.contentLength !== f.bytes) {
          throw new Error(`size mismatch after upload (local ${f.bytes}, remote ${after.contentLength})`);
        }
        const remoteMd5 = after.contentHash ? Buffer.from(after.contentHash).toString('hex') : null;
        if (remoteMd5 && remoteMd5 !== f.md5) {
          throw new Error('md5 mismatch after upload');
        }
        report.uploaded.push({ blob: f.blobName, bytes: f.bytes, sha256: f.sha256 });
      } catch (err) {
        report.failed.push({ blob: f.blobName, error: err && err.message ? err.message : String(err) });
      }
    }
  }

  // ---- human-readable summary ----
  console.log('\n== Inventory by category ==');
  for (const [cat, s] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${s.files} file(s), ${(s.bytes / 1024).toFixed(1)} KiB`);
  }
  console.log(`Total: ${files.length} file(s), ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);
  console.log(`Collisions: ${collisions.length === 0 ? 'none' : collisions.join(', ')}`);
  console.log(`Skipped (never uploaded): ${skipped.length}`);
  for (const s of skipped) console.log(`  [${s.category}] ${s.file} (${s.reason})`);
  if (args.mongoUri) {
    console.log(`DB references scanned: ${dbRefs.length}; missing on disk: ${missing.length}`);
    for (const m of missing.slice(0, 50)) {
      console.log(`  MISSING ${m.collection} ${m.id} ${m.field} = ${m.value} (${m.reason})`);
    }
    if (missing.length > 50) console.log(`  …and ${missing.length - 50} more (see --json report)`);
  } else {
    console.log('DB references: not scanned (pass --mongo-uri to detect missing referenced files).');
  }
  if (args.execute) {
    console.log(`Uploaded: ${report.uploaded.length}; already-present (skipped): ${report.skippedPresent.length}; failed: ${report.failed.length}`);
    for (const f of report.failed) console.log(`  FAILED ${f.blob}: ${f.error}`);
  } else {
    console.log('Dry-run: no uploads performed. Re-run with --execute to migrate.');
  }
  console.log('\n== Render production files ==');
  console.log(
    'This tool only sees the --source-dir you point it at. Render hosts run on ' +
      'ephemeral disks: files uploaded in production live on the Render instance, ' +
      'NOT in this git checkout. If live Render file access (SSH/snapshot or a ' +
      'one-off job that tars /opt/render/project/src/backend/uploads) is unavailable, ' +
      'transferring those production files remains a SEPARATE operational prerequisite: ' +
      'fetch a full uploads snapshot from Render, run this tool in --dry-run against ' +
      'the snapshot, then --execute. Source files are never deleted by this tool, ' +
      'and database records are never rewritten by this tool.'
  );

  if (args.json) {
    await fsp.writeFile(args.json, JSON.stringify(report, null, 2));
    console.log(`\nFull report written to ${args.json}`);
  }
  if (report.failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`Migration failed: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
