'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(REPO_ROOT, 'public');
const DIST_ROOT = path.join(REPO_ROOT, 'dist', 'public');
const BACKUP_ROOT = path.join(REPO_ROOT, 'dist', '_backups');
const MANIFEST_NAME = 'BUILD_MANIFEST.json';

const args = new Set(process.argv.slice(2));
const knownArgs = new Set(['--apply', '--accept-drift']);
const unknownArgs = [...args].filter((arg) => !knownArgs.has(arg));

if (unknownArgs.length) {
  console.error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  process.exit(2);
}

const apply = args.has('--apply');
const acceptDrift = args.has('--accept-drift');

// Drift may be accepted only during a real copy, so a dry run can never silently waive it.
if (acceptDrift && !apply) {
  console.error('--accept-drift is valid only together with --apply.');
  process.exit(2);
}

// Fixed roots and containment checks prevent a path mistake from reaching data/ or android/.
function assertInside(candidate, parent, label) {
  const relative = path.relative(parent, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} is not safely contained in ${parent}: ${candidate}`);
  }
}

assertInside(SOURCE_ROOT, REPO_ROOT, 'Source root');
assertInside(DIST_ROOT, path.join(REPO_ROOT, 'dist'), 'Distribution root');
assertInside(BACKUP_ROOT, path.join(REPO_ROOT, 'dist'), 'Backup root');

// Normalize separators so matching, logs, and the manifest are stable on every platform.
function normalizeRelative(relativePath) {
  return relativePath.split(path.sep).join('/');
}

// These source artifacts are backups or generated/debug output and must never be shipped.
function exclusionReason(relativePath, isDirectory) {
  const normalized = normalizeRelative(relativePath);
  const parts = normalized.split('/');
  const name = parts[parts.length - 1];

  if (parts.some((part) => part.startsWith('_bak'))) return 'folder starting with _bak';
  if (parts.includes('boot_logo_segments')) return 'boot_logo_segments folder';
  if (!isDirectory && name === 'layout.generated.css') return 'layout.generated.css';
  if (!isDirectory && /\.pre-.*\.bak$/i.test(name)) return '*.pre-*.bak';
  if (!isDirectory && /\.bak$/i.test(name)) return '*.bak';
  if (!isDirectory && / - Copia\.[^/]+$/i.test(name)) return '* - Copia.*';
  return null;
}

// Symbolic links are rejected because following one could copy content from outside public/.
function walkFiles(root, collectExclusions) {
  const files = new Map();
  const excluded = [];

  function visit(directory, relativeDirectory = '') {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const relativePath = relativeDirectory
        ? path.join(relativeDirectory, entry.name)
        : entry.name;
      const absolutePath = path.join(directory, entry.name);

      if (entry.isSymbolicLink()) {
        throw new Error(`Symbolic links are not supported: ${absolutePath}`);
      }

      const reason = exclusionReason(relativePath, entry.isDirectory());
      if (reason) {
        if (collectExclusions) collectExcludedTree(absolutePath, relativePath, reason, excluded);
        continue;
      }

      if (entry.isDirectory()) {
        visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        files.set(normalizeRelative(relativePath), fileRecord(absolutePath));
      } else {
        throw new Error(`Unsupported filesystem entry: ${absolutePath}`);
      }
    }
  }

  visit(root);
  return { files, excluded };
}

// Excluded directories are enumerated for an honest excluded-file count without copying them.
function collectExcludedTree(absolutePath, relativePath, reason, excluded) {
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink()) {
    throw new Error(`Symbolic links are not supported: ${absolutePath}`);
  }
  if (stat.isFile()) {
    excluded.push({ path: normalizeRelative(relativePath), reason });
    return;
  }
  if (!stat.isDirectory()) {
    throw new Error(`Unsupported filesystem entry: ${absolutePath}`);
  }
  const entries = fs.readdirSync(absolutePath, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    collectExcludedTree(
      path.join(absolutePath, entry.name),
      path.join(relativePath, entry.name),
      reason,
      excluded
    );
  }
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function fileRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    absolutePath: filePath,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    hash: null
  };
}

function recordHash(record) {
  if (!record.hash) record.hash = sha256(record.absolutePath);
  return record.hash;
}

// Every derived destination is checked again before use to keep writes inside dist/public/.
function destinationPath(relativePath) {
  const candidate = path.resolve(DIST_ROOT, ...relativePath.split('/'));
  assertInside(candidate, DIST_ROOT, 'Destination file');
  return candidate;
}

function printList(title, entries, format = (entry) => entry) {
  console.log(`${title} (${entries.length})`);
  for (const entry of entries) console.log(`  ${format(entry)}`);
}

function backupTimestamp(date) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10).replace(/-/g, '')}-${iso.slice(11, 19).replace(/:/g, '')}`;
}

function createBackup() {
  const backupPath = path.join(BACKUP_ROOT, `public-${backupTimestamp(new Date())}`);
  assertInside(backupPath, BACKUP_ROOT, 'Backup directory');
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });

  if (fs.existsSync(backupPath)) {
    throw new Error(`Backup destination already exists: ${backupPath}`);
  }

  // A complete pre-copy snapshot makes every overwritten release file recoverable.
  if (fs.existsSync(DIST_ROOT)) {
    const stat = fs.statSync(DIST_ROOT);
    if (!stat.isDirectory()) throw new Error(`Distribution root is not a directory: ${DIST_ROOT}`);
    fs.cpSync(DIST_ROOT, backupPath, {
      recursive: true,
      force: false,
      errorOnExist: true,
      preserveTimestamps: true
    });
  } else {
    // An empty backup records that the served root did not exist before this first deployment.
    fs.mkdirSync(backupPath);
  }

  if (!fs.statSync(backupPath).isDirectory()) {
    throw new Error(`Backup verification failed: ${backupPath}`);
  }
  return backupPath;
}

function main() {
  if (!fs.existsSync(SOURCE_ROOT) || !fs.statSync(SOURCE_ROOT).isDirectory()) {
    throw new Error(`Source directory not found: ${SOURCE_ROOT}`);
  }

  const sourceScan = walkFiles(SOURCE_ROOT, true);
  const distScan = fs.existsSync(DIST_ROOT)
    ? walkFiles(DIST_ROOT, false)
    : { files: new Map(), excluded: [] };

  // The manifest is generated release metadata, so it is not source drift on later runs.
  distScan.files.delete(MANIFEST_NAME);

  const newFiles = [];
  const changedFiles = [];
  const unchangedFiles = [];
  const drift = [];

  for (const [relativePath, source] of sourceScan.files) {
    const destination = distScan.files.get(relativePath);
    if (!destination) {
      newFiles.push(relativePath);
      continue;
    }
    if (destination.mtimeMs > source.mtimeMs) {
      drift.push({ path: relativePath, reason: 'dist file is newer than source' });
    }
    if (recordHash(source) === recordHash(destination)) {
      unchangedFiles.push(relativePath);
    } else {
      changedFiles.push(relativePath);
    }
  }

  // Dist-only files are preserved, but require an explicit drift acceptance before any copy.
  for (const relativePath of distScan.files.keys()) {
    if (!sourceScan.files.has(relativePath)) {
      drift.push({ path: relativePath, reason: 'exists only in dist/public' });
    }
  }

  newFiles.sort();
  changedFiles.sort();
  unchangedFiles.sort();
  sourceScan.excluded.sort((a, b) => a.path.localeCompare(b.path));
  drift.sort((a, b) => a.path.localeCompare(b.path) || a.reason.localeCompare(b.reason));

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(
    `Counts: new=${newFiles.length} changed=${changedFiles.length} ` +
    `unchanged=${unchangedFiles.length} excluded=${sourceScan.excluded.length}`
  );
  printList('NEW', newFiles);
  printList('CHANGED', changedFiles);
  printList('UNCHANGED', unchangedFiles);
  printList('EXCLUDED', sourceScan.excluded, (entry) => `${entry.path} — ${entry.reason}`);

  if (drift.length) {
    printList('DRIFT', drift, (entry) => `${entry.path} — ${entry.reason}`);
    if (!acceptDrift) {
      console.error('Drift guard stopped the operation. Use --apply --accept-drift to override.');
      process.exitCode = 1;
      return;
    }
  }

  // Dry-run is the default and returns after reporting; it never creates directories or files.
  if (!apply) return;

  let backupPath;
  try {
    backupPath = createBackup();
  } catch (error) {
    // No release file is copied unless the full backup completed successfully.
    throw new Error(`Backup failed; no files were copied. ${error.message}`);
  }
  console.log(`Backup created: ${backupPath}`);

  fs.mkdirSync(DIST_ROOT, { recursive: true });
  const copiedFiles = [...newFiles, ...changedFiles].sort();
  for (const relativePath of copiedFiles) {
    const source = sourceScan.files.get(relativePath);
    const destination = destinationPath(relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source.absolutePath, destination);
    // Matching source timestamps prevents the copy itself from looking like newer dist drift.
    const sourceStat = fs.statSync(source.absolutePath);
    fs.utimesSync(destination, sourceStat.atime, sourceStat.mtime);
  }

  const mismatches = [];
  for (const relativePath of copiedFiles) {
    const sourceHash = recordHash(sourceScan.files.get(relativePath));
    const copiedHash = sha256(destinationPath(relativePath));
    if (sourceHash !== copiedHash) mismatches.push(relativePath);
  }

  if (mismatches.length) {
    printList('SHA-256 MISMATCHES', mismatches);
    process.exitCode = 1;
    return;
  }

  console.log(`Verified copied files: ${copiedFiles.length}`);

  const manifestFiles = [...sourceScan.files.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([relativePath, record]) => ({
      path: relativePath,
      sha256: recordHash(record),
      size: record.size
    }));
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceRoot: SOURCE_ROOT,
    files: manifestFiles
  };
  const manifestPath = destinationPath(MANIFEST_NAME);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Manifest written: ${manifestPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
