import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import pc from 'picocolors';
import { loadConfig } from './config-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.resolve(rootDir, 'output');

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function hasSips() {
  try {
    execSync('which sips', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Compute the target raster pixel size for a PDF page at a given DPI.
 * PDF page boxes are expressed in points (1 point = 1/72 inch), so the
 * configured DPI must be converted to pixels before it can be handed to
 * `sips -z` -- without this, `sips` rasterizes at its own fixed default
 * resolution and the DPI setting has no effect on output size at all.
 */
async function getPdfTargetSize(inputPath, dpi) {
  const pdfBytes = fs.readFileSync(inputPath);
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const page = doc.getPage(0);
  const { width, height } = page.getSize();
  const scale = Number(dpi) / 72;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * 1. Compress an existing PDF file using config settings
 */
export async function compressPdf(inputPath, outputPath, customOptions = {}) {
  const config = loadConfig();
  const quality = customOptions.quality ?? config.outgoing.pdf.imageQuality ?? 80;
  const dpi = customOptions.dpi ?? config.incoming?.pdfRenderDpi ?? config.outgoing.pdf.screenDpi ?? 150;

  const origSize = fs.statSync(inputPath).size;
  const tempDir = path.join(outputDir, '.temp_pdf');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const tempImgPath = path.join(tempDir, `${baseName}_screen.png`);

  try {
    if (hasSips()) {
      // Step A: Convert PDF to raster image at the configured DPI using sips
      const target = await getPdfTargetSize(inputPath, dpi);
      execSync(
        `sips -s format png -z ${target.height} ${target.width} "${inputPath}" --out "${tempImgPath}"`,
        { stdio: 'pipe' }
      );

      // Step B: Recompress through MozJPEG with configured quality
      const jpegBuffer = await sharp(tempImgPath)
        .jpeg({
          quality: Number(quality),
          mozjpeg: config.outgoing.jpg.mozjpeg ?? true,
          progressive: config.outgoing.jpg.progressive ?? true,
          trellisQuantisation: config.outgoing.jpg.trellisQuantisation ?? true,
          overshootDeringing: config.outgoing.jpg.overshootDeringing ?? true,
          chromaSubsampling: config.outgoing.jpg.chromaSubsampling || '4:2:0',
        })
        .toBuffer();

      // Step C: Build optimized PDF using pdf-lib
      const newPdfDoc = await PDFDocument.create();
      const embeddedJpg = await newPdfDoc.embedJpg(jpegBuffer);
      const { width, height } = embeddedJpg.scale(1);
      const page = newPdfDoc.addPage([width, height]);
      page.drawImage(embeddedJpg, { x: 0, y: 0, width, height });

      // Set clean metadata and compress object streams
      newPdfDoc.setProducer('Designer Media Studio by unS0uL');
      newPdfDoc.setCreator('Designer Media Studio by unS0uL');
      const compressedBytes = await newPdfDoc.save({ useObjectStreams: config.outgoing.pdf.useObjectStreams ?? true });
      fs.writeFileSync(outputPath, compressedBytes);

      // Clean temp
      if (fs.existsSync(tempImgPath)) fs.rmSync(tempImgPath, { force: true });
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });

      const newSize = fs.statSync(outputPath).size;
      const savings = Math.max(0, origSize - newSize);
      const pct = origSize > 0 ? Math.round((savings / origSize) * 100) : 0;

      console.log(
        pc.green(`✔ [PDF Compressed (${dpi} DPI, Quality ${quality}%)] `) +
        pc.bold(path.basename(inputPath)) +
        pc.dim(` (${formatBytes(origSize)} → `) +
        pc.cyan(formatBytes(newSize)) +
        pc.dim(`) `) +
        pc.magenta(`[Saved ${pct}%]`)
      );

      return {
        filename: path.basename(inputPath),
        originalSize: origSize,
        compressedSize: newSize,
        savingsPct: pct,
        path: outputPath,
      };
    } else {
      // Fallback: pure JS object stream compression with pdf-lib
      const pdfBytes = fs.readFileSync(inputPath);
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      doc.setProducer('Designer Media Studio by unS0uL');
      const compressedBytes = await doc.save({ useObjectStreams: true });
      fs.writeFileSync(outputPath, compressedBytes);

      const newSize = fs.statSync(outputPath).size;
      const savings = Math.max(0, origSize - newSize);
      const pct = origSize > 0 ? Math.round((savings / origSize) * 100) : 0;

      return {
        filename: path.basename(inputPath),
        originalSize: origSize,
        compressedSize: newSize,
        savingsPct: pct,
        path: outputPath,
      };
    }
  } catch (err) {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    console.error(pc.red(`✖ Error compressing PDF ${inputPath}:`), err.message);
    throw err;
  }
}

/**
 * 2. Convert PDF pages to images (WebP, JPG, PNG) using config settings
 */
export async function convertPdfToImages(inputPath, targetFormats = null, customOptions = {}) {
  const config = loadConfig();
  const formats = targetFormats || config.outgoing.enabledFormats || ['webp', 'jpg', 'png'];
  const dpi = customOptions.dpi ?? config.incoming?.pdfRenderDpi ?? config.outgoing.pdf.screenDpi ?? 150;

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const tempDir = path.join(outputDir, '.temp_pdf_render');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempPng = path.join(tempDir, `${baseName}.png`);
  const results = [];

  try {
    if (!hasSips()) {
      throw new Error('PDF to Image rendering requires macOS sips or browser-side rendering');
    }

    const target = await getPdfTargetSize(inputPath, dpi);
    execSync(
      `sips -s format png -z ${target.height} ${target.width} "${inputPath}" --out "${tempPng}"`,
      { stdio: 'pipe' }
    );
    const s = sharp(tempPng);

    // 1. WebP
    if (formats.includes('webp')) {
      const outWebp = path.join(outputDir, 'webp', `${baseName}.webp`);
      await s.clone().webp({
        quality: Number(customOptions.webpQuality ?? config.outgoing.webp.quality ?? 80),
        effort: Number(config.outgoing.webp.effort ?? 4),
        lossless: Boolean(config.outgoing.webp.lossless ?? false),
      }).toFile(outWebp);
      results.push({ format: 'webp', path: `output/webp/${baseName}.webp`, size: fs.statSync(outWebp).size });
    }

    // 2. MozJPEG
    if (formats.includes('jpg')) {
      const outJpg = path.join(outputDir, 'jpg', `${baseName}.jpg`);
      await s.clone().jpeg({
        quality: Number(customOptions.jpgQuality ?? config.outgoing.jpg.quality ?? 80),
        mozjpeg: Boolean(config.outgoing.jpg.mozjpeg ?? true),
        progressive: Boolean(config.outgoing.jpg.progressive ?? true),
        trellisQuantisation: Boolean(config.outgoing.jpg.trellisQuantisation ?? true),
        overshootDeringing: Boolean(config.outgoing.jpg.overshootDeringing ?? true),
        chromaSubsampling: config.outgoing.jpg.chromaSubsampling || '4:2:0',
      }).toFile(outJpg);
      results.push({ format: 'jpg', path: `output/jpg/${baseName}.jpg`, size: fs.statSync(outJpg).size });
    }

    // 3. PNG
    if (formats.includes('png')) {
      const outPng = path.join(outputDir, 'png', `${baseName}.png`);
      await s.clone().png({
        quality: Number(customOptions.pngQuality ?? config.outgoing.png.quality ?? 85),
        palette: Boolean(config.outgoing.png.palette ?? true),
        compressionLevel: Number(config.outgoing.png.compressionLevel ?? 9),
        effort: Number(config.outgoing.png.effort ?? 7),
      }).toFile(outPng);
      results.push({ format: 'png', path: `output/png/${baseName}.png`, size: fs.statSync(outPng).size });
    }

    // 4. AVIF
    if (formats.includes('avif')) {
      const outAvif = path.join(outputDir, 'avif', `${baseName}.avif`);
      await s.clone().avif({
        quality: Number(customOptions.avifQuality ?? config.outgoing.avif.quality ?? 75),
        effort: Number(config.outgoing.avif.effort ?? 4),
        chromaSubsampling: config.outgoing.avif.chromaSubsampling || '4:2:0',
      }).toFile(outAvif);
      results.push({ format: 'avif', path: `output/avif/${baseName}.avif`, size: fs.statSync(outAvif).size });
    }

    // Cleanup
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });

    return results;
  } catch (err) {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    console.error(pc.red(`✖ Error converting PDF ${inputPath}:`), err.message);
    throw err;
  }
}

/**
 * 3. Convert multiple images into a single compressed PDF
 */
export async function convertImagesToPdf(imagePaths, outputPath) {
  const config = loadConfig();
  const quality = config.outgoing.pdf.imageQuality ?? 80;

  const doc = await PDFDocument.create();
  for (const imgPath of imagePaths) {
    const ext = path.extname(imgPath).toLowerCase();
    let imgBuffer;
    if (ext === '.jpg' || ext === '.jpeg') {
      imgBuffer = fs.readFileSync(imgPath);
    } else {
      imgBuffer = await sharp(imgPath)
        .jpeg({ quality: Number(quality), mozjpeg: true })
        .toBuffer();
    }
    const embedded = await doc.embedJpg(imgBuffer);
    const { width, height } = embedded.scale(1);
    const page = doc.addPage([width, height]);
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  doc.setProducer('Designer Media Studio by unS0uL');
  const pdfBytes = await doc.save({ useObjectStreams: config.outgoing.pdf.useObjectStreams ?? true });
  fs.writeFileSync(outputPath, pdfBytes);
  return {
    path: outputPath,
    size: pdfBytes.length,
    pageCount: imagePaths.length,
  };
}
