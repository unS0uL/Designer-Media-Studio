/**
 * Automated Test Suite: PDF DPI Regression
 * Confirms the configured render DPI actually controls the rasterized page
 * size. Prior to this fix, `sips` was invoked without any resolution flag,
 * so every preset (96 / 150 / 200 DPI) produced identical output regardless
 * of the configured value -- this is what made PDF/JPG "compression" look
 * broken (page raster size never changed between presets).
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { PDFDocument, rgb } from 'pdf-lib';
import { compressPdf, convertPdfToImages } from '../scripts/pdf-engine.js';

async function makeSamplePdf(targetPath) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  page.drawRectangle({ x: 20, y: 20, width: 360, height: 260, color: rgb(0.9, 0.9, 0.95) });
  page.drawText('Designer Media Studio DPI test', { x: 40, y: 150, size: 18, color: rgb(0.1, 0.1, 0.5) });
  const bytes = await doc.save();
  fs.writeFileSync(targetPath, bytes);
}

async function runTests() {
  console.log('--- Testing PDF Render DPI ---');

  const tempDir = path.join(os.tmpdir(), 'studio-test-pdf-dpi-' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });
  const samplePdf = path.join(tempDir, 'sample.pdf');
  await makeSamplePdf(samplePdf);

  // Test 1: rasterized page pixel width grows with the configured DPI
  const outLow = path.join(tempDir, 'low.pdf');
  const outHigh = path.join(tempDir, 'high.pdf');
  await compressPdf(samplePdf, outLow, { dpi: 72, quality: 80 });
  await compressPdf(samplePdf, outHigh, { dpi: 200, quality: 80 });

  const lowDoc = await PDFDocument.load(fs.readFileSync(outLow));
  const highDoc = await PDFDocument.load(fs.readFileSync(outHigh));
  assert.ok(lowDoc.getPageCount() === 1 && highDoc.getPageCount() === 1, 'Both compressed PDFs have one page');
  console.log('✓ Test 1 Passed: compressPdf produced valid single-page PDFs at both DPIs');

  // Test 2: higher DPI must yield a strictly larger embedded raster (bigger file)
  const lowSize = fs.statSync(outLow).size;
  const highSize = fs.statSync(outHigh).size;
  assert.ok(highSize > lowSize, `200 DPI output (${highSize}B) must be larger than 72 DPI output (${lowSize}B)`);
  console.log(`✓ Test 2 Passed: DPI controls output size (72dpi=${lowSize}B < 200dpi=${highSize}B)`);

  // Test 3: convertPdfToImages produces a wider raster at higher DPI.
  // pdf-engine.js resolves its own output dir relative to its module location
  // (the real project output/ folder), so we assert on the returned JPG file
  // sizes directly rather than an isolated temp dir. Both DPI runs write to
  // the same shared output/jpg/sample.jpg path, so each
  // file must be read immediately after its own run, before the next run
  // overwrites it.
  const pdfEngineDir = path.dirname(new URL('../scripts/pdf-engine.js', import.meta.url).pathname);
  const imagesLow = await convertPdfToImages(samplePdf, ['jpg'], { dpi: 72 });
  assert.strictEqual(imagesLow.length, 1, 'Low DPI produced one JPG output');
  const lowMeta = await sharp(path.resolve(pdfEngineDir, '..', imagesLow[0].path)).metadata();

  const imagesHigh = await convertPdfToImages(samplePdf, ['jpg'], { dpi: 200 });
  assert.strictEqual(imagesHigh.length, 1, 'High DPI produced one JPG output');
  const highMeta = await sharp(path.resolve(pdfEngineDir, '..', imagesHigh[0].path)).metadata();

  assert.ok(highMeta.width > lowMeta.width, `200 DPI raster (${highMeta.width}px) must be wider than 72 DPI raster (${lowMeta.width}px)`);
  console.log(`✓ Test 3 Passed: convertPdfToImages rasterizes wider at higher DPI (72dpi=${lowMeta.width}px < 200dpi=${highMeta.width}px)`);

  // Cleanup
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('✓ Cleanup: Temporary PDF DPI test directory removed');
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }

  console.log('\nAll PDF DPI tests passed successfully! ✅');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
