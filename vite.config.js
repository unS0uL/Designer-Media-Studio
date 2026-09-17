import { defineConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import chokidar from 'chokidar';
import JSZip from 'jszip';
import { fileURLToPath } from 'node:url';
import {
  ensureDirs,
  getDirs,
  resolvePath,
  processImage,
  processIcon,
  processAll,
  updateItemInStats,
  removeItemFromStats,
  removeOutputsForFile,
  reencodeFormatWithQuality,
  LIVE_QUALITY_FORMATS,
  loadStats,
  rootDir,
} from './scripts/engine.ts';
import { loadConfig, saveConfig, resetConfig, PRESETS } from './scripts/config-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const repoMatch = (pkg.repository?.url || '').match(/github\.com[:/]([^/]+)\/([^/.]+)/);
const repoSlug = repoMatch ? `${repoMatch[1]}/${repoMatch[2]}` : null;

export default defineConfig(() => {
  const activeConfig = loadConfig();
  const serverPort = Number(activeConfig.server?.port || 4040);

  return {
    root: path.resolve(__dirname, 'src'),
    build: {
      // `root` is 'src', so Vite's default outDir ('dist', resolved relative
      // to root) would land at src/dist/ -- not the project-root dist/ that
      // .gitignore expects. Anchor it explicitly to the project root.
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    server: {
      port: serverPort,
      open: true,
    },
    plugins: [
      {
        name: 'designer-media-studio',
        configureServer(server) {
          let currentConfig = loadConfig();
          let currentDirs = getDirs(currentConfig);
          ensureDirs(currentConfig);

        // 1. Static Asset Serving Middleware for Output Directory
        server.middlewares.use((req, res, next) => {
          if (req.method !== 'GET') return next();
          const cleanUrl = decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''));
          let candidate = path.join(currentDirs.outputDir, cleanUrl);
          if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
            const match = cleanUrl.match(/(?:^|\/)(webp|avif|jpg|png|icons|pdf)\/([^/]+)$/i);
            if (match) {
              const fallbackCandidate = path.join(currentDirs.outputDir, match[1].toLowerCase(), match[2]);
              if (fs.existsSync(fallbackCandidate) && fs.statSync(fallbackCandidate).isFile()) {
                candidate = fallbackCandidate;
              }
            }
          }
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            const ext = path.extname(candidate).toLowerCase();
            const mimeTypes = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.webp': 'image/webp',
              '.avif': 'image/avif',
              '.svg': 'image/svg+xml',
              '.tiff': 'image/tiff',
              '.pdf': 'application/pdf',
              '.json': 'application/json',
            };
            if (mimeTypes[ext]) res.setHeader('Content-Type', mimeTypes[ext]);
            return fs.createReadStream(candidate).pipe(res);
          }
          next();
        });

        // 2. API: Get Current Stats
        server.middlewares.use('/api/stats', (req, res, next) => {
          if (req.method !== 'GET') return next();
          res.setHeader('Content-Type', 'application/json');
          if (fs.existsSync(currentDirs.statsFile)) {
            res.end(fs.readFileSync(currentDirs.statsFile, 'utf8'));
          } else {
            res.end(JSON.stringify({ files: [], summary: { totalOriginal: 0, totalOptimized: 0, totalSavings: 0 } }));
          }
        });

        // 2b. API: App Version & Repo (for the footer version/update-check display)
        server.middlewares.use('/api/version', (req, res, next) => {
          if (req.method !== 'GET') return next();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ version: pkg.version, repo: repoSlug }));
        });

        // 3. API: Serve Original Input File for Split Comparison
        server.middlewares.use('/api/original', (req, res, next) => {
          if (req.method !== 'GET') return next();
          try {
            const parsedUrl = new URL(req.url, 'http://localhost');
            const filename = parsedUrl.searchParams.get('file');
            if (!filename) {
              res.statusCode = 400;
              return res.end('Missing file parameter');
            }
            const cleanName = path.basename(filename);
            for (const dir of [currentDirs.inputImages, currentDirs.inputIcons, currentDirs.inputPdf]) {
              const candidate = path.join(dir, cleanName);
              if (fs.existsSync(candidate)) {
                const ext = path.extname(cleanName).toLowerCase();
                const mimeTypes = {
                  '.jpg': 'image/jpeg',
                  '.jpeg': 'image/jpeg',
                  '.png': 'image/png',
                  '.webp': 'image/webp',
                  '.avif': 'image/avif',
                  '.svg': 'image/svg+xml',
                  '.tiff': 'image/tiff',
                  '.pdf': 'application/pdf',
                };
                res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
                return fs.createReadStream(candidate).pipe(res);
              }
            }
            res.statusCode = 404;
            res.end('Original file not found');
          } catch (err) {
            res.statusCode = 500;
            res.end(err.message);
          }
        });

        // 3b. API: Live-preview one format at a custom quality (in-memory,
        // no disk write). Scoped to the Images tab only -- PDF-derived
        // rasters go through sips/DPI, and icons keep a fixed format with a
        // separate pngQuality setting, neither fits a single quality slider.
        server.middlewares.use('/api/preview-format-quality', (req, res, next) => {
          if (req.method !== 'POST') return next();
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', async () => {
            try {
              const { filename, format, quality } = JSON.parse(data || '{}');
              if (!filename || !LIVE_QUALITY_FORMATS.includes(format)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Missing or unsupported filename/format' }));
              }
              const inputPath = path.join(currentDirs.inputImages, path.basename(filename));
              if (!fs.existsSync(inputPath)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Live quality preview only supports files from the Images tab' }));
              }
              const buffer = await reencodeFormatWithQuality(inputPath, format, Number(quality) || 1, currentConfig);
              const mimeTypes = { webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png' };
              res.setHeader('Content-Type', mimeTypes[format]);
              res.setHeader('X-Preview-Size', String(buffer.length));
              res.end(buffer);
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });

        // 3c. API: Persist a custom quality as the saved output for one file+format
        server.middlewares.use('/api/save-format-quality', (req, res, next) => {
          if (req.method !== 'POST') return next();
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', async () => {
            try {
              const { filename, format, quality } = JSON.parse(data || '{}');
              if (!filename || !LIVE_QUALITY_FORMATS.includes(format)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Missing or unsupported filename/format' }));
              }
              const cleanName = path.basename(filename);
              const inputPath = path.join(currentDirs.inputImages, cleanName);
              if (!fs.existsSync(inputPath)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Live quality preview only supports files from the Images tab' }));
              }

              const buffer = await reencodeFormatWithQuality(inputPath, format, Number(quality) || 1, currentConfig);
              const outDirKey = { webp: 'outWebp', avif: 'outAvif', jpg: 'outJpg', png: 'outPng' }[format];
              const name = path.basename(cleanName, path.extname(cleanName));
              const outPath = path.join(currentDirs[outDirKey], `${name}.${format}`);
              fs.writeFileSync(outPath, buffer);

              const stats = loadStats(currentConfig);
              const fileEntry = stats.files.find(f => f.filename === cleanName);
              if (!fileEntry) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'No existing stats entry for this file -- run Optimize once first' }));
              }
              const outEntry = fileEntry.outputs.find(o => o.format === format);
              if (outEntry) outEntry.size = buffer.length;
              fileEntry.bestSize = Math.min(...fileEntry.outputs.map(o => o.size));
              const savings = Math.max(0, fileEntry.originalSize - fileEntry.bestSize);
              fileEntry.savingsPct = fileEntry.originalSize > 0 ? Math.round((savings / fileEntry.originalSize) * 100) : 0;
              fileEntry.updatedAt = new Date().toISOString();

              const updatedStats = updateItemInStats(fileEntry, currentConfig);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, size: buffer.length, file: fileEntry, stats: updatedStats }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });

        // 4. API: Get Configuration Presets
        server.middlewares.use('/api/config/presets', (req, res, next) => {
          if (req.method !== 'GET') return next();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(PRESETS));
        });

        // 5. API: Reset Configuration to Defaults / Presets
        server.middlewares.use('/api/config/reset', (req, res, next) => {
          if (req.method !== 'POST') return next();
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', () => {
            try {
              let presetKey = 'web_standard';
              if (data) {
                try {
                  const body = JSON.parse(data);
                  if (body.preset) presetKey = body.preset;
                } catch {}
              }
              const oldPort = Number(currentConfig.server?.port || 4040);
              const config = resetConfig(presetKey);
              const newPort = Number(config.server?.port || 4040);
              const portChanged = oldPort !== newPort;

              currentConfig = config;
              currentDirs = getDirs(currentConfig);
              ensureDirs(currentConfig);
              updateWatcherPaths();

              server.ws.send({ type: 'custom', event: 'config-updated', data: config });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, config, preset: presetKey, portChanged, oldPort, newPort }));

              if (portChanged) {
                console.log(`[Studio] Port changed upon reset from ${oldPort} to ${newPort}. Restarting Vite server...`);
                setTimeout(async () => {
                  try {
                    await server.restart();
                  } catch (err) {
                    console.error('[Studio] Restart error:', err);
                  }
                }, 400);
              }
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });

        // 6. API: Get & Update Configuration
        server.middlewares.use('/api/config', (req, res, next) => {
          if (req.url !== '/' && req.url !== '') return next();
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(loadConfig()));
            return;
          }
          if (req.method === 'POST') {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(data);

                // Validate and test creation of paths before saving
                try {
                  ensureDirs(parsed);
                } catch (dirErr) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: `Path error: ${dirErr.message}` }));
                }

                const oldPort = Number(currentConfig.server?.port || 4040);
                const newPort = parsed.server?.port ? Number(parsed.server.port) : oldPort;
                const portChanged = oldPort !== newPort;

                const saved = saveConfig(parsed);
                currentConfig = saved;
                currentDirs = getDirs(currentConfig);
                updateWatcherPaths();

                server.ws.send({ type: 'custom', event: 'config-updated', data: saved });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  config: saved,
                  portChanged,
                  oldPort,
                  newPort,
                }));

                if (portChanged) {
                  console.log(`[Studio] Port changed from ${oldPort} to ${newPort}. Restarting Vite server...`);
                  setTimeout(async () => {
                    try {
                      await server.restart();
                    } catch (err) {
                      console.error('[Studio] Restart error:', err);
                    }
                  }, 400);
                }
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
          next();
        });

        // 7. API: Re-optimize All Files using Current Config
        server.middlewares.use('/api/reoptimize', async (req, res, next) => {
          if (req.method !== 'POST') return next();
          try {
            const stats = await processAll(currentConfig);
            server.ws.send({ type: 'custom', event: 'assets-updated' });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, stats }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });

        // 8. API: Download All as ZIP
        server.middlewares.use('/api/download-zip', async (req, res, next) => {
          if (req.method !== 'GET') return next();
          try {
            const zip = new JSZip();
            const subdirs = ['webp', 'avif', 'jpg', 'png', 'pdf', 'icons'];
            let fileCount = 0;

            for (const sub of subdirs) {
              const subPath = path.join(currentDirs.outputDir, sub);
              if (fs.existsSync(subPath)) {
                const files = fs.readdirSync(subPath).filter(f => f !== '.gitkeep');
                for (const file of files) {
                  const content = fs.readFileSync(path.join(subPath, file));
                  zip.folder(sub).file(file, content);
                  fileCount++;
                }
              }
            }

            if (fileCount === 0) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'No files to download' }));
              return;
            }

            const archiveBuffer = await zip.generateAsync({
              type: 'nodebuffer',
              compression: 'DEFLATE',
              compressionOptions: { level: 6 },
            });

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="optimized-assets-unS0uL.zip"');
            res.end(archiveBuffer);
          } catch (err) {
            console.error('Error creating ZIP archive:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });

        // 9. API: Clean Output Directories
        server.middlewares.use('/api/clean', (req, res, next) => {
          if (req.method !== 'POST') return next();
          try {
            const subdirs = ['webp', 'avif', 'jpg', 'png', 'pdf', 'icons'];
            for (const sub of subdirs) {
              const target = path.join(currentDirs.outputDir, sub);
              if (fs.existsSync(target)) {
                for (const f of fs.readdirSync(target)) {
                  if (f !== '.gitkeep') {
                    fs.rmSync(path.join(target, f), { recursive: true, force: true });
                  }
                }
              }
            }
            if (fs.existsSync(currentDirs.statsFile)) fs.rmSync(currentDirs.statsFile, { force: true });
            server.ws.send({ type: 'custom', event: 'assets-updated' });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });

        // 10. API: Upload File from Web UI
        server.middlewares.use('/api/upload', (req, res, next) => {
          if (req.method !== 'POST') return next();
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', async () => {
            try {
              const { filename, mode, base64, targetFormats } = JSON.parse(data);
              const fileBuffer = Buffer.from(base64, 'base64');
              const ext = path.extname(filename).toLowerCase();
              let savedPath;
              let item = null;

              if (mode === 'icon' || (ext === '.svg' && mode !== 'image')) {
                savedPath = path.join(currentDirs.inputIcons, filename);
                fs.writeFileSync(savedPath, fileBuffer);
                item = await processIcon(savedPath, currentConfig);
              } else if (ext === '.pdf') {
                savedPath = path.join(currentDirs.inputPdf, filename);
                fs.writeFileSync(savedPath, fileBuffer);
                item = await processImage(savedPath, targetFormats, currentConfig);
              } else {
                savedPath = path.join(currentDirs.inputImages, filename);
                fs.writeFileSync(savedPath, fileBuffer);
                item = await processImage(savedPath, targetFormats, currentConfig);
              }

              if (item) {
                updateItemInStats(item, currentConfig);
                server.ws.send({ type: 'custom', event: 'assets-updated' });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, item }));
              } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Unsupported file format' }));
              }
            } catch (err) {
              console.error('API Upload error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });

        // 11. API: Paste SVG Markup Directly
        server.middlewares.use('/api/paste-svg', (req, res, next) => {
          if (req.method !== 'POST') return next();
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', async () => {
            try {
              const { svgCode, filename } = JSON.parse(data);
              if (!svgCode || typeof svgCode !== 'string') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Missing svgCode parameter' }));
              }

              const trimmed = svgCode.trim();
              if (!trimmed.toLowerCase().includes('<svg') || !trimmed.toLowerCase().includes('</svg>')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Invalid SVG markup. Missing <svg> and </svg> tags.' }));
              }

              let safeName = filename?.trim() ? filename.trim().replace(/[^a-zA-Z0-9._-]/g, '_') : '';
              if (!safeName || safeName === '.svg') {
                const idMatch = trimmed.match(/id=["']([^"']+)["']/i);
                const titleMatch = trimmed.match(/<title>([^<]+)<\/title>/i);
                if (titleMatch && titleMatch[1]) {
                  safeName = titleMatch[1].trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
                } else if (idMatch && idMatch[1]) {
                  safeName = idMatch[1].trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
                } else {
                  safeName = `icon-${Date.now()}`;
                }
              }
              if (!safeName.toLowerCase().endsWith('.svg')) {
                safeName += '.svg';
              }

              const savedPath = path.join(currentDirs.inputIcons, safeName);
              fs.writeFileSync(savedPath, trimmed, 'utf8');

              const item = await processIcon(savedPath, currentConfig);
              if (item) {
                updateItemInStats(item, currentConfig);
                server.ws.send({ type: 'custom', event: 'assets-updated' });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, item, filename: safeName }));
              } else {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Could not process SVG with SVGO' }));
              }
            } catch (err) {
              console.error('API Paste SVG error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });

        // 12. API: Browse Filesystem Directory Structure
        server.middlewares.use('/api/fs/browse', (req, res, next) => {
          if (req.method !== 'GET') return next();
          try {
            const parsedUrl = new URL(req.url, 'http://localhost');
            const reqPath = parsedUrl.searchParams.get('path');
            const targetPath = reqPath ? resolvePath(reqPath) : rootDir;

            if (!fs.existsSync(targetPath)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: `Path does not exist: ${targetPath}` }));
            }

            const stat = fs.statSync(targetPath);
            if (!stat.isDirectory()) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: `Not a directory: ${targetPath}` }));
            }

            let entries = [];
            try {
              entries = fs.readdirSync(targetPath, { withFileTypes: true });
            } catch (readErr) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: `Permission denied: ${readErr.message}` }));
            }

            const subdirs = entries
              .filter(e => {
                try {
                  return e.isDirectory() && !e.name.startsWith('.');
                } catch {
                  return false;
                }
              })
              .map(e => ({
                name: e.name,
                path: path.join(targetPath, e.name),
              }))
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

            const parentPath = path.dirname(targetPath);
            const isRoot = parentPath === targetPath;

            const drives = [];
            if (process.platform === 'win32') {
              for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
                try {
                  if (fs.existsSync(`${letter}:\\`)) drives.push(`${letter}:\\`);
                } catch {}
              }
            } else {
              drives.push('/');
            }

            const home = os.homedir();
            const desktop = path.join(home, 'Desktop');
            const downloads = path.join(home, 'Downloads');
            const pictures = path.join(home, 'Pictures');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              currentPath: targetPath,
              parentPath: isRoot ? null : parentPath,
              rootDir,
              homeDir: home,
              quickLinks: [
                { name: 'Project', path: rootDir },
                { name: 'Home', path: home },
                fs.existsSync(desktop) ? { name: 'Desktop', path: desktop } : null,
                fs.existsSync(downloads) ? { name: 'Downloads', path: downloads } : null,
                fs.existsSync(pictures) ? { name: 'Pictures', path: pictures } : null,
              ].filter(Boolean),
              drives,
              directories: subdirs,
            }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });

        // 13. API: Trigger Native OS Folder Picker
        server.middlewares.use('/api/fs/pick-os-folder', (req, res, next) => {
          if (req.method !== 'POST') return next();
          try {
            let selectedPath = null;
            if (process.platform === 'darwin') {
              try {
                const stdout = execSync(
                  `osascript -e 'try' -e 'POSIX path of (choose folder with prompt "Select Media Studio Folder")' -e 'end try'`,
                  { stdio: ['pipe', 'pipe', 'ignore'], timeout: 60000 }
                ).toString().trim();
                if (stdout) selectedPath = stdout;
              } catch {}
            } else if (process.platform === 'win32') {
              try {
                const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Select Media Studio Folder'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath }"`;
                const stdout = execSync(psCmd, { stdio: ['pipe', 'pipe', 'ignore'], timeout: 60000 }).toString().trim();
                if (stdout) selectedPath = stdout;
              } catch {}
            } else if (process.platform === 'linux') {
              try {
                const stdout = execSync(`zenity --file-selection --directory --title="Select Media Studio Folder"`, { stdio: ['pipe', 'pipe', 'ignore'], timeout: 60000 }).toString().trim();
                if (stdout) selectedPath = stdout;
              } catch {}
            }

            res.setHeader('Content-Type', 'application/json');
            if (selectedPath && fs.existsSync(selectedPath)) {
              res.end(JSON.stringify({ success: true, path: selectedPath }));
            } else {
              res.end(JSON.stringify({ success: false, cancelled: true }));
            }
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });

        // 14. Chokidar File Watcher
        let watcher = chokidar.watch([currentDirs.inputImages, currentDirs.inputIcons, currentDirs.inputPdf], {
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100,
          },
        });

        function updateWatcherPaths() {
          try {
            watcher.close();
            watcher = chokidar.watch([currentDirs.inputImages, currentDirs.inputIcons, currentDirs.inputPdf], {
              ignoreInitial: true,
              awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100,
              },
            });
            attachWatcherEvents(watcher);
          } catch (e) {
            console.error('Failed to update watcher paths:', e.message);
          }
        }

        const handleFileChange = async (filePath) => {
          try {
            let item = null;
            if (filePath.startsWith(currentDirs.inputImages) || filePath.startsWith(currentDirs.inputPdf)) {
              item = await processImage(filePath, null, currentConfig);
            } else if (filePath.startsWith(currentDirs.inputIcons)) {
              item = await processIcon(filePath, currentConfig);
            }
            if (item) {
              updateItemInStats(item, currentConfig);
              server.ws.send({ type: 'custom', event: 'assets-updated' });
            }
          } catch (err) {
            console.error('Error handling file:', filePath, err);
          }
        };

        function attachWatcherEvents(w) {
          w.on('add', handleFileChange);
          w.on('change', handleFileChange);
          w.on('unlink', (filePath) => {
            try {
              const isIcon = filePath.startsWith(currentDirs.inputIcons);
              const filename = path.basename(filePath);
              removeOutputsForFile(filePath, isIcon, currentConfig);
              removeItemFromStats(filename, currentConfig);
              server.ws.send({ type: 'custom', event: 'assets-updated' });
            } catch (err) {
              console.error('Error removing file:', filePath, err);
            }
          });
        }

        attachWatcherEvents(watcher);

        server.httpServer?.once('close', () => watcher.close());
      },
      buildStart() {
        ensureDirs();
      },
    },
  ],
  };
});
