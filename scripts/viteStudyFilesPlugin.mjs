import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RESERVED_DIRS = new Set([
  'src',
  'node_modules',
  'dist',
  'tests',
  'scripts',
  'config',
  'public',
  '.git',
]);

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function getIgnoredDirs(rootDir) {
  const ignored = new Set(RESERVED_DIRS);
  const blueprintPath = path.join(rootDir, 'config', 'study-blueprints.json');
  try {
    if (fs.existsSync(blueprintPath)) {
      const parsed = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));
      if (Array.isArray(parsed.ignoredDirectories)) {
        for (const dir of parsed.ignoredDirectories) {
          if (typeof dir === 'string' && dir.trim()) {
            ignored.add(dir.trim());
          }
        }
      }
    }
  } catch {
    // Fallback to RESERVED_DIRS
  }
  return ignored;
}

function resolveSafeStudyFile(rootDir, urlPath, ignoredDirs) {
  let cleanPath = '';
  try {
    cleanPath = decodeURIComponent((urlPath || '').split('?')[0].split('#')[0]);
  } catch {
    return null;
  }

  const trimmed = cleanPath.replace(/^\/+/, '');
  const segments = trimmed.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const [folderName, ...restSegments] = segments;
  if (
    !folderName ||
    folderName.startsWith('.') ||
    folderName.includes('..') ||
    folderName.includes('\\') ||
    ignoredDirs.has(folderName) ||
    restSegments.some(
      (seg) => !seg || seg.startsWith('.') || seg.includes('..') || seg.includes('\\')
    )
  ) {
    return null;
  }

  const folderPath = path.resolve(rootDir, folderName);
  const filePath = path.resolve(folderPath, ...restSegments);
  const fileName = restSegments[restSegments.length - 1];

  try {
    if (!fs.existsSync(folderPath) || !fs.existsSync(filePath)) return null;
    const realRoot = fs.realpathSync(rootDir);
    const realFolder = fs.realpathSync(folderPath);
    const realFile = fs.realpathSync(filePath);

    if (!realFolder.startsWith(realRoot + path.sep)) return null;
    if (!realFile.startsWith(realFolder + path.sep)) return null;
    if (!fs.statSync(realFile).isFile()) return null;

    const ext = path.extname(realFile).toLowerCase();
    if (!MIME_BY_EXT[ext]) return null;

    return { filePath: realFile, fileName, mimeType: MIME_BY_EXT[ext] };
  } catch {
    return null;
  }
}

function createStudyMiddleware(rootDir) {
  const ignoredDirs = getIgnoredDirs(rootDir);

  return (req, res, next) => {
    const reqUrl = req.url || '';
    const resolved = resolveSafeStudyFile(rootDir, reqUrl, ignoredDirs);
    if (!resolved) {
      res.statusCode = 404;
      res.end('Study file not found');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', resolved.mimeType);
    const safeDispositionName = resolved.fileName.replace(/["\r\n]/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="${safeDispositionName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    const stream = fs.createReadStream(resolved.filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Failed to read study file');
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  };
}

/**
 * Vite plugin that exposes subject PDFs at `/study-files/<subjectFolder>/<filename>`
 * in dev, preview, and built `dist/` output so `#page=N` links jump to exact slides.
 */
export function serveStudyFilesPlugin(rootDirUrl) {
  const rootDir = rootDirUrl
    ? fileURLToPath(rootDirUrl)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  return {
    name: 'serve-study-files',
    configureServer(server) {
      server.middlewares.use('/study-files', createStudyMiddleware(rootDir));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/study-files', createStudyMiddleware(rootDir));
    },
    writeBundle(outputOptions) {
      const outDir = outputOptions?.dir ? path.resolve(outputOptions.dir) : path.resolve(rootDir, 'dist');
      const ignoredDirs = getIgnoredDirs(rootDir);

      const copyTree = (srcDir, relParts) => {
        const items = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const item of items) {
          if (item.name.startsWith('.')) continue;
          const full = path.join(srcDir, item.name);
          if (item.isDirectory()) {
            copyTree(full, [...relParts, item.name]);
            continue;
          }
          if (!item.isFile()) continue;
          const ext = path.extname(item.name).toLowerCase();
          if (!MIME_BY_EXT[ext]) continue;

          const destDir = path.join(outDir, 'study-files', ...relParts);
          fs.mkdirSync(destDir, { recursive: true });
          fs.copyFileSync(full, path.join(destDir, item.name));
        }
      };

      try {
        const entries = fs.readdirSync(rootDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith('.') || ignoredDirs.has(entry.name)) {
            continue;
          }
          copyTree(path.join(rootDir, entry.name), [entry.name]);
        }
      } catch {
        // Non-fatal if outDir is customized without disk emit
      }
    },
  };
}
