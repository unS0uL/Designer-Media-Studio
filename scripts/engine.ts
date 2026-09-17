import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { optimize as optimizeSvg } from 'svgo';
import pc from 'picocolors';
import { compressPdf, convertPdfToImages } from './pdf-engine.js';
import { loadConfig } from './config-manager.js';

// config-manager.js is not typed (out of scope for this migration), so the
// loaded/passed-in config shape is treated as untyped here, same as before.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StudioConfig = any;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export interface Dirs {
  rootDir: string;
  inputDir: string;
  outputDir: string;
  relOutput: string;
  inputImages: string;
  inputIcons: string;
  inputPdf: string;
  outWebp: string;
  outAvif: string;
  outJpg: string;
  outPng: string;
  outPdf: string;
  outIcons: string;
  statsFile: string;
}

export interface OutputEntry {
  format: string;
  path: string;
  // pdf-engine.js's convertPdfToImages() (still plain JS, out of this
  // migration's scope) does not set relPath on the entries it returns --
  // getOutputUrl() in the Web UI already falls back to parsing `path` when
  // relPath is absent, so this reflects real, already-handled behavior.
  relPath?: string;
  size: number;
}

export type AssetType = 'image' | 'icon' | 'pdf';

export interface ProcessResult {
  filename: string;
  type: AssetType;
  originalSize: number;
  dimensions: string;
  outputs: OutputEntry[];
  bestSize: number;
  savingsPct: number;
  updatedAt: string;
}

export interface StatsSummary {
  totalOriginal: number;
  totalOptimized: number;
  totalSavings: number;
}

export interface StatsFile {
  files: ProcessResult[];
  summary: StatsSummary;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, '..');

/**
 * Cross-platform path resolution supporting:
 * 1. POSIX absolute paths: /Users/..., /var/..., /Volumes/...
 * 2. Windows drive letters: C:\..., D:/...
 * 3. Windows UNC paths: \\server\share\...
 * 4. User home directory tilde expansion: ~/Pictures, ~\Desktop
 * 5. Relative paths: input, ./output, ../shared-assets (resolved relative to baseDir)
 */
export function resolvePath(rawPath?: string | null, baseDir: string = rootDir): string {
  if (!rawPath || typeof rawPath !== 'string') return baseDir;
  let trimmed = rawPath.trim();
  if (!trimmed) return baseDir;

  // 1. Expand tilde (~) for macOS / Linux / Windows user home
  if (trimmed === '~') {
    return os.homedir();
  }
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    trimmed = path.join(os.homedir(), trimmed.slice(2));
  }

  // 2. Resolve absolute vs relative
  const resolved = path.isAbsolute(trimmed)
    ? path.normalize(trimmed)
    : path.resolve(baseDir, trimmed);

  return resolved;
}

/**
 * Dynamically resolve directory paths based on config.paths settings
 */
export function getDirs(customConfig: StudioConfig = null): Dirs {
  const config = customConfig || loadConfig();
  const inPath = config.paths?.input || 'input';
  const outPath = config.paths?.output || 'output';

  const inBase = resolvePath(inPath);
  const outBase = resolvePath(outPath);

  // Relative path or directory label for output folder
  const relOutput = path.isAbsolute(outBase) ? path.basename(outBase) : outPath.replace(/\\/g, '/');

  return {
    rootDir,
    inputDir: inBase,
    outputDir: outBase,
    relOutput,
    inputImages: path.join(inBase, 'images'),
    inputIcons: path.join(inBase, 'icons'),
    inputPdf: path.join(inBase, 'pdf'),
    outWebp: path.join(outBase, 'webp'),
    outAvif: path.join(outBase, 'avif'),
    outJpg: path.join(outBase, 'jpg'),
    outPng: path.join(outBase, 'png'),
    outPdf: path.join(outBase, 'pdf'),
    outIcons: path.join(outBase, 'icons'),
    statsFile: path.join(outBase, 'stats.json'),
  };
}

// Proxy for backward compatibility with DIRS object properties
export const DIRS: Dirs = new Proxy({} as Dirs, {
  get: (_, prop: string) => (getDirs() as unknown as Record<string, string>)[prop],
}) as Dirs;

/**
 * Ensure all input and output directories exist on the filesystem
 */
export function ensureDirs(customConfig: StudioConfig = null): void {
  const dirs = getDirs(customConfig);
  const folderList = [
    dirs.inputImages,
    dirs.inputIcons,
    dirs.inputPdf,
    dirs.outWebp,
    dirs.outAvif,
    dirs.outJpg,
    dirs.outPng,
    dirs.outPdf,
    dirs.outIcons,
  ];

  for (const dir of folderList) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        throw new Error(`Failed to create directory "${dir}": ${errMsg(err)}`, { cause: err });
      }
    }
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function loadStats(customConfig: StudioConfig = null): StatsFile {
  const { statsFile } = getDirs(customConfig);
  try {
    if (fs.existsSync(statsFile)) {
      return JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    }
  } catch {}
  return { files: [], summary: { totalOriginal: 0, totalOptimized: 0, totalSavings: 0 } };
}

export function saveStats(stats: StatsFile, customConfig: StudioConfig = null): void {
  const { statsFile } = getDirs(customConfig);
  try {
    ensureDirs(customConfig);
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  } catch (e) {
    console.error('Failed to save stats:', errMsg(e));
  }
}

export function updateItemInStats(item: ProcessResult, customConfig: StudioConfig = null): StatsFile {
  const stats = loadStats(customConfig);
  const idx = stats.files.findIndex(f => f.filename === item.filename);
  if (idx >= 0) {
    stats.files[idx] = item;
  } else {
    stats.files.push(item);
  }
  stats.summary.totalOriginal = stats.files.reduce((acc, f) => acc + f.originalSize, 0);
  stats.summary.totalOptimized = stats.files.reduce((acc, f) => acc + f.bestSize, 0);
  stats.summary.totalSavings = Math.max(0, stats.summary.totalOriginal - stats.summary.totalOptimized);
  saveStats(stats, customConfig);
  return stats;
}

export function removeItemFromStats(filename: string, customConfig: StudioConfig = null): StatsFile {
  const stats = loadStats(customConfig);
  stats.files = stats.files.filter(f => f.filename !== filename);
  stats.summary.totalOriginal = stats.files.reduce((acc, f) => acc + f.originalSize, 0);
  stats.summary.totalOptimized = stats.files.reduce((acc, f) => acc + f.bestSize, 0);
  stats.summary.totalSavings = Math.max(0, stats.summary.totalOriginal - stats.summary.totalOptimized);
  saveStats(stats, customConfig);
  return stats;
}

export function removeOutputsForFile(filePath: string, isIcon: boolean, customConfig: StudioConfig = null): void {
  const dirs = getDirs(customConfig);
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath, ext);
  if (isIcon) {
    const iconPath = path.join(dirs.outIcons, `${name}${ext}`);
    if (fs.existsSync(iconPath)) fs.rmSync(iconPath, { force: true });
  } else {
    for (const sub of ['webp', 'avif', 'jpg', 'png', 'pdf']) {
      const outPath = path.join(dirs.outputDir, sub, `${name}.${sub}`);
      if (fs.existsSync(outPath)) fs.rmSync(outPath, { force: true });
    }
  }
}

/**
 * Decode an image and apply the configured incoming preprocessing rules
 * (auto-orient, sRGB, max-dimension downscale). Shared by processImage()
 * and reencodeFormatWithQuality() so both start from the identical pixels.
 */
async function decodeAndPreprocess(
  filePath: string,
  config: StudioConfig
): Promise<{ image: sharp.Sharp; metadata: sharp.Metadata }> {
  let image: sharp.Sharp = sharp(filePath);

  if (config.incoming?.autoOrient !== false) {
    image = image.rotate();
  }
  if (config.incoming?.convertToSrgb !== false) {
    image = image.toColorspace('srgb');
  }
  if (config.incoming?.maxDimension && Number(config.incoming.maxDimension) > 0) {
    const maxDim = Number(config.incoming.maxDimension);
    image = image.resize({
      width: maxDim,
      height: maxDim,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const metadata = await image.metadata();
  return { image, metadata };
}

export type LiveQualityFormat = 'webp' | 'avif' | 'jpg' | 'png';
export const LIVE_QUALITY_FORMATS: LiveQualityFormat[] = ['webp', 'avif', 'jpg', 'png'];

/**
 * Re-encode a single already-decoded source image at one format and a
 * caller-supplied quality, entirely in memory (no disk write). Every other
 * setting (effort, mozjpeg flags, palette, ...) still comes from config --
 * only "quality" is the live-adjustable knob, matching the Compare modal's
 * slider. Used for both the live preview (discarded) and "Save" (written to
 * disk by the caller) paths, so they always encode identically.
 */
export async function reencodeFormatWithQuality(
  filePath: string,
  format: LiveQualityFormat,
  quality: number,
  customConfig: StudioConfig = null
): Promise<Buffer> {
  const config = customConfig || loadConfig();
  const { image, metadata } = await decodeAndPreprocess(filePath, config);
  const q = Math.max(1, Math.min(100, Math.round(quality)));

  switch (format) {
    case 'webp':
      return image.clone().webp({
        quality: q,
        effort: Number(config.outgoing.webp.effort ?? 4),
        lossless: Boolean(config.outgoing.webp.lossless ?? false),
      }).toBuffer();
    case 'avif':
      return image.clone().avif({
        quality: q,
        effort: Number(config.outgoing.avif.effort ?? 4),
        chromaSubsampling: config.outgoing.avif.chromaSubsampling || '4:2:0',
      }).toBuffer();
    case 'jpg': {
      let pipeline = image.clone();
      if (metadata.hasAlpha) {
        pipeline = pipeline.flatten({ background: '#ffffff' });
      }
      return pipeline.jpeg({
        quality: q,
        mozjpeg: Boolean(config.outgoing.jpg.mozjpeg ?? true),
        progressive: Boolean(config.outgoing.jpg.progressive ?? true),
        trellisQuantisation: Boolean(config.outgoing.jpg.trellisQuantisation ?? true),
        overshootDeringing: Boolean(config.outgoing.jpg.overshootDeringing ?? true),
        chromaSubsampling: config.outgoing.jpg.chromaSubsampling || '4:2:0',
      }).toBuffer();
    }
    case 'png':
      return image.clone().png({
        quality: q,
        palette: Boolean(config.outgoing.png.palette ?? true),
        compressionLevel: Number(config.outgoing.png.compressionLevel ?? 9),
        effort: Number(config.outgoing.png.effort ?? 7),
      }).toBuffer();
    default:
      throw new Error(`Live quality preview is not supported for format "${format}"`);
  }
}

/**
 * Process a single image from input folder or Web UI using config rules
 */
export async function processImage(
  filePath: string,
  targetFormats: string[] | null = null,
  customConfig: StudioConfig = null
): Promise<ProcessResult | null> {
  ensureDirs(customConfig);
  const config = customConfig || loadConfig();
  const dirs = getDirs(config);
  const formats: string[] = targetFormats || config.outgoing.enabledFormats || ['webp', 'avif', 'jpg', 'png'];

  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath, ext);
  const origStat = fs.statSync(filePath);
  const origSize = origStat.size;

  if (!['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.pdf'].includes(ext)) {
    return null;
  }

  // Handle PDF documents
  if (ext === '.pdf') {
    const pdfOutPath = path.join(dirs.outPdf, `${name}.pdf`);
    const pdfRes = await compressPdf(filePath, pdfOutPath);
    let imgOutputs: OutputEntry[] = [];
    try {
      imgOutputs = await convertPdfToImages(filePath, formats);
    } catch (e) {
      console.warn(pc.yellow(`Notice: PDF image page extraction: ${errMsg(e)}`));
    }
    const allOutputs: OutputEntry[] = [
      { format: 'pdf', path: `${dirs.relOutput}/pdf/${name}.pdf`, relPath: `pdf/${name}.pdf`, size: pdfRes.compressedSize },
      ...imgOutputs,
    ];
    const bestSize = Math.min(...allOutputs.map(r => r.size));
    const savings = Math.max(0, origSize - bestSize);
    const pct = origSize > 0 ? Math.round((savings / origSize) * 100) : 0;

    return {
      filename: path.basename(filePath),
      type: 'pdf',
      originalSize: origSize,
      dimensions: 'PDF Document',
      outputs: allOutputs,
      bestSize,
      savingsPct: pct,
      updatedAt: new Date().toISOString(),
    };
  }

  // 1-2. Decode + incoming preprocessing rules (shared with reencodeFormatWithQuality)
  const { image, metadata } = await decodeAndPreprocess(filePath, config);
  const results: OutputEntry[] = [];

  // 1. WebP Output (Alpha preserved)
  if (formats.includes('webp')) {
    const webpPath = path.join(dirs.outWebp, `${name}.webp`);
    await image.clone().webp({
      quality: Number(config.outgoing.webp.quality ?? 80),
      effort: Number(config.outgoing.webp.effort ?? 4),
      lossless: Boolean(config.outgoing.webp.lossless ?? false),
    }).toFile(webpPath);
    const webpSize = fs.statSync(webpPath).size;
    results.push({ format: 'webp', path: `${dirs.relOutput}/webp/${name}.webp`, relPath: `webp/${name}.webp`, size: webpSize });
  }

  // 2. AVIF Output (Alpha preserved)
  if (formats.includes('avif')) {
    const avifPath = path.join(dirs.outAvif, `${name}.avif`);
    await image.clone().avif({
      quality: Number(config.outgoing.avif.quality ?? 75),
      effort: Number(config.outgoing.avif.effort ?? 4),
      chromaSubsampling: config.outgoing.avif.chromaSubsampling || '4:2:0',
    }).toFile(avifPath);
    const avifSize = fs.statSync(avifPath).size;
    results.push({ format: 'avif', path: `${dirs.relOutput}/avif/${name}.avif`, relPath: `avif/${name}.avif`, size: avifSize });
  }

  // 3. MozJPEG Output (Flatten transparent alpha to white)
  if (formats.includes('jpg')) {
    const jpgPath = path.join(dirs.outJpg, `${name}.jpg`);
    let jpgPipeline = image.clone();
    if (metadata.hasAlpha) {
      // Flatten transparent background to pure white instead of Sharp default black
      jpgPipeline = jpgPipeline.flatten({ background: '#ffffff' });
    }
    await jpgPipeline.jpeg({
      quality: Number(config.outgoing.jpg.quality ?? 80),
      mozjpeg: Boolean(config.outgoing.jpg.mozjpeg ?? true),
      progressive: Boolean(config.outgoing.jpg.progressive ?? true),
      trellisQuantisation: Boolean(config.outgoing.jpg.trellisQuantisation ?? true),
      overshootDeringing: Boolean(config.outgoing.jpg.overshootDeringing ?? true),
      chromaSubsampling: config.outgoing.jpg.chromaSubsampling || '4:2:0',
    }).toFile(jpgPath);
    const jpgSize = fs.statSync(jpgPath).size;
    results.push({ format: 'jpg', path: `${dirs.relOutput}/jpg/${name}.jpg`, relPath: `jpg/${name}.jpg`, size: jpgSize });
  }

  // 4. PNG Output (Quantized 8-bit palette with preserved alpha)
  if (formats.includes('png')) {
    const pngPath = path.join(dirs.outPng, `${name}.png`);
    await image.clone().png({
      quality: Number(config.outgoing.png.quality ?? 85),
      palette: Boolean(config.outgoing.png.palette ?? true),
      compressionLevel: Number(config.outgoing.png.compressionLevel ?? 9),
      effort: Number(config.outgoing.png.effort ?? 7),
    }).toFile(pngPath);
    const pngSize = fs.statSync(pngPath).size;
    results.push({ format: 'png', path: `${dirs.relOutput}/png/${name}.png`, relPath: `png/${name}.png`, size: pngSize });
  }


  // Reporting
  const bestSize = results.length > 0 ? Math.min(...results.map(r => r.size)) : origSize;
  const savings = Math.max(0, origSize - bestSize);
  const pct = origSize > 0 ? Math.round((savings / origSize) * 100) : 0;

  console.log(
    pc.green('✔ [Image Optimized] ') +
    pc.bold(path.basename(filePath)) +
    pc.dim(` (${formatBytes(origSize)}) → `) +
    results.map(r => `${r.format.toUpperCase()}: ${formatBytes(r.size)}`).join(', ') +
    pc.magenta(` [Saved ${pct}%]`)
  );

  return {
    filename: path.basename(filePath),
    type: 'image',
    originalSize: origSize,
    dimensions: `${metadata?.width || '?'}x${metadata?.height || '?'}`,
    outputs: results,
    bestSize,
    savingsPct: pct,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Process an icon from input folder using config rules (STRICT NO FORMAT CONVERSION)
 */
export async function processIcon(filePath: string, customConfig: StudioConfig = null): Promise<ProcessResult | null> {
  ensureDirs(customConfig);
  const config = customConfig || loadConfig();
  const dirs = getDirs(config);
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath, ext);
  const origStat = fs.statSync(filePath);
  const origSize = origStat.size;

  if (ext === '.svg') {
    const rawSvg = fs.readFileSync(filePath, 'utf8');
    const svgoOpts = config.outgoing.icons?.svgo || {};
    // svgo's PluginConfig types require each preset-default override to be
    // `false | {options}`, not a plain boolean, even though the runtime
    // happily accepts boolean `true`/`false` for all of these -- the type
    // is stricter than the actual accepted shape, so the overrides object
    // is built as `any` here rather than fighting each property.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const presetOverrides: any = {
      removeViewBox: Boolean(svgoOpts.removeViewBox ?? false),
      cleanupIds: Boolean(svgoOpts.cleanupIds ?? true),
      collapseGroups: Boolean(svgoOpts.collapseGroups ?? true),
      removeTitle: false,
    };
    const result = optimizeSvg(rawSvg, {
      path: filePath,
      multipass: Boolean(svgoOpts.multipass ?? true),
      plugins: [
        {
          name: 'preset-default',
          params: { overrides: presetOverrides },
        },
      ],
    });

    const outPath = path.join(dirs.outIcons, `${name}.svg`);
    fs.writeFileSync(outPath, result.data, 'utf8');
    const newSize = fs.statSync(outPath).size;
    const savings = Math.max(0, origSize - newSize);
    const pct = origSize > 0 ? Math.round((savings / origSize) * 100) : 0;

    console.log(
      pc.green('✔ [Icon SVGO (Preserved SVG)] ') +
      pc.bold(path.basename(filePath)) +
      pc.dim(` (${formatBytes(origSize)} → `) +
      pc.cyan(formatBytes(newSize)) +
      pc.dim(`) `) +
      pc.magenta(`[Saved ${pct}%]`)
    );

    return {
      filename: path.basename(filePath),
      type: 'icon',
      originalSize: origSize,
      dimensions: 'Vector SVG',
      outputs: [{ format: 'svg', path: `${dirs.relOutput}/icons/${name}.svg`, relPath: `icons/${name}.svg`, size: newSize }],
      bestSize: newSize,
      savingsPct: pct,
      updatedAt: new Date().toISOString(),
    };
  } else if (ext === '.png') {
    const outPath = path.join(dirs.outIcons, `${name}.png`);
    const pngQuality = Number(config.outgoing.icons?.pngQuality ?? 90);
    const pngPalette = Boolean(config.outgoing.icons?.pngPalette ?? true);

    await sharp(filePath)
      .png({ quality: pngQuality, palette: pngPalette, compressionLevel: 9 })
      .toFile(outPath);
    const newSize = fs.statSync(outPath).size;
    const savings = Math.max(0, origSize - newSize);
    const pct = origSize > 0 ? Math.round((savings / origSize) * 100) : 0;

    console.log(
      pc.green('✔ [Icon PNG (Preserved PNG)] ') +
      pc.bold(path.basename(filePath)) +
      pc.dim(` (${formatBytes(origSize)} → `) +
      pc.cyan(formatBytes(newSize)) +
      pc.dim(`) `) +
      pc.magenta(`[Saved ${pct}%]`)
    );

    return {
      filename: path.basename(filePath),
      type: 'icon',
      originalSize: origSize,
      dimensions: 'Raster PNG',
      outputs: [{ format: 'png', path: `${dirs.relOutput}/icons/${name}.png`, relPath: `icons/${name}.png`, size: newSize }],
      bestSize: newSize,
      savingsPct: pct,
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Scan all input directories and batch process all assets
 */
export async function processAll(customConfig: StudioConfig = null): Promise<StatsFile> {
  ensureDirs(customConfig);
  const config = customConfig || loadConfig();
  const dirs = getDirs(config);

  console.log(pc.bold(pc.cyan(`\n🚀 [Designer Media Studio by unS0uL] Processing all assets with config.json...\n`)));

  const stats: StatsFile = {
    files: [],
    summary: { totalOriginal: 0, totalOptimized: 0, totalSavings: 0 },
  };

  // 1. Process Images
  if (fs.existsSync(dirs.inputImages)) {
    const files = fs.readdirSync(dirs.inputImages).filter(f => !f.startsWith('.'));
    for (const f of files) {
      try {
        const item = await processImage(path.join(dirs.inputImages, f), null, config);
        if (item) stats.files.push(item);
      } catch (err) {
        console.error(pc.red(`✖ Error processing image ${f}:`), errMsg(err));
      }
    }
  }

  // 2. Process Icons
  if (fs.existsSync(dirs.inputIcons)) {
    const files = fs.readdirSync(dirs.inputIcons).filter(f => !f.startsWith('.'));
    for (const f of files) {
      try {
        const item = await processIcon(path.join(dirs.inputIcons, f), config);
        if (item) stats.files.push(item);
      } catch (err) {
        console.error(pc.red(`✖ Error processing icon ${f}:`), errMsg(err));
      }
    }
  }

  // 3. Process PDF documents if present
  if (fs.existsSync(dirs.inputPdf)) {
    const files = fs.readdirSync(dirs.inputPdf).filter(f => !f.startsWith('.') && f.toLowerCase().endsWith('.pdf'));
    for (const f of files) {
      try {
        const item = await processImage(path.join(dirs.inputPdf, f), null, config);
        if (item) stats.files.push(item);
      } catch (err) {
        console.error(pc.red(`✖ Error processing PDF ${f}:`), errMsg(err));
      }
    }
  }

  // Summary calculation
  stats.summary.totalOriginal = stats.files.reduce((acc, f) => acc + f.originalSize, 0);
  stats.summary.totalOptimized = stats.files.reduce((acc, f) => acc + f.bestSize, 0);
  stats.summary.totalSavings = Math.max(0, stats.summary.totalOriginal - stats.summary.totalOptimized);
  const totalPct = stats.summary.totalOriginal > 0
    ? Math.round((stats.summary.totalSavings / stats.summary.totalOriginal) * 100)
    : 0;

  saveStats(stats, config);

  console.log(pc.bold(pc.green(`\n✨ Done! Processed ${stats.files.length} file(s).`)));
  console.log(pc.dim(`Total Original:  ${formatBytes(stats.summary.totalOriginal)}`));
  console.log(pc.dim(`Total Optimized: ${formatBytes(stats.summary.totalOptimized)}`));
  console.log(pc.bold(pc.magenta(`Total Saved:     ${formatBytes(stats.summary.totalSavings)} (-${totalPct}%)\n`)));

  return stats;
}

// Direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  processAll().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
