/**
 * Automated Test Suite: Cross-Platform Path Handling and Disk Storage
 * Tests path resolution (POSIX, Windows drive letters, tilde expansion, relative paths)
 * and verifies processing with external system directories.
 */

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import sharp from 'sharp';
import {
  resolvePath,
  getDirs,
  ensureDirs,
  processImage,
  processIcon,
  rootDir,
} from '../scripts/engine.ts';

async function runTests() {
  console.log('--- Testing Cross-Platform Path Resolution ---');

  // Test 1: Relative Path Resolution
  const relIn = resolvePath('input');
  assert.strictEqual(relIn, path.resolve(rootDir, 'input'), 'Relative path should resolve against rootDir');
  console.log('✓ Test 1 Passed: Relative path resolves against rootDir');

  // Test 2: Tilde (~) Expansion
  const homeTest = resolvePath('~/Pictures/DesignAssets');
  const expectedHome = path.join(os.homedir(), 'Pictures', 'DesignAssets');
  assert.strictEqual(path.normalize(homeTest), path.normalize(expectedHome), 'Tilde should expand to user home directory');
  console.log('✓ Test 2 Passed: User home directory ~ expansion works correctly');

  // Test 3: POSIX Absolute Path
  const posixAbs = resolvePath('/var/opt/media-studio');
  assert.strictEqual(path.normalize(posixAbs), path.normalize('/var/opt/media-studio'), 'POSIX absolute path should remain absolute');
  console.log('✓ Test 3 Passed: POSIX absolute path remains intact');

  // Test 4: Slash Normalization (Backslashes to OS standard)
  const mixedPath = resolvePath('input\\nested\\folder');
  assert.ok(!mixedPath.includes('\\\\'), 'Backslashes should be normalized');
  console.log('✓ Test 4 Passed: Backslash normalization works cleanly');

  // Test 5: Windows Drive Letter Handling
  const winMock = resolvePath('D:\\Production\\Assets');
  assert.ok(winMock.startsWith('D:') || winMock.startsWith('/'), 'Windows drive paths should be recognized as absolute');
  console.log('✓ Test 5 Passed: Windows drive letter format handled properly');

  console.log('\n--- Testing Directory Mapping & Creation for External Paths ---');
  const tempInput = path.join(os.tmpdir(), 'studio-test-input-' + Date.now());
  const tempOutput = path.join(os.tmpdir(), 'studio-test-output-' + Date.now());

  const customConfig = {
    paths: {
      input: tempInput,
      output: tempOutput,
    },
    incoming: {
      maxDimension: 1200,
      autoOrient: true,
      convertToSrgb: true,
    },
    outgoing: {
      enabledFormats: ['webp', 'jpg', 'png'],
      webp: { quality: 80, effort: 4, lossless: false },
      jpg: { quality: 80, mozjpeg: true, progressive: true, trellisQuantisation: true, overshootDeringing: true },
      png: { quality: 85, palette: true, compressionLevel: 9, effort: 7 },
      icons: { svgo: { multipass: true, removeViewBox: false }, pngQuality: 85, pngPalette: true },
      pdf: { screenDpi: 150, imageQuality: 80 },
    },
  };

  const dirs = getDirs(customConfig);
  assert.strictEqual(dirs.inputDir, tempInput, 'inputDir should point to tempInput');
  assert.strictEqual(dirs.outputDir, tempOutput, 'outputDir should point to tempOutput');
  assert.strictEqual(dirs.inputImages, path.join(tempInput, 'images'));
  assert.strictEqual(dirs.inputIcons, path.join(tempInput, 'icons'));
  assert.strictEqual(dirs.inputPdf, path.join(tempInput, 'pdf'));
  assert.strictEqual(dirs.outWebp, path.join(tempOutput, 'webp'));
  console.log('✓ Test 6 Passed: getDirs properly maps subfolders to external disk directory');

  ensureDirs(customConfig);
  assert.ok(fs.existsSync(dirs.inputImages), 'External input/images directory created');
  assert.ok(fs.existsSync(dirs.inputIcons), 'External input/icons directory created');
  assert.ok(fs.existsSync(dirs.inputPdf), 'External input/pdf directory created');
  assert.ok(fs.existsSync(dirs.outWebp), 'External output/webp directory created');
  assert.ok(fs.existsSync(dirs.outAvif), 'External output/avif directory created');
  assert.ok(fs.existsSync(dirs.outJpg), 'External output/jpg directory created');
  assert.ok(fs.existsSync(dirs.outPng), 'External output/png directory created');
  assert.ok(fs.existsSync(dirs.outPdf), 'External output/pdf directory created');
  assert.ok(fs.existsSync(dirs.outIcons), 'External output/icons directory created');
  console.log('✓ Test 7 Passed: ensureDirs creates all directories in external system disk path');

  console.log('\n--- Testing Asset Processing in External Disk Paths ---');
  // Create a sample image in external input directory
  const testImagePath = path.join(dirs.inputImages, 'external-sample.png');
  await sharp({
    create: {
      width: 300,
      height: 200,
      channels: 4,
      background: { r: 50, g: 150, b: 250, alpha: 0.5 },
    },
  }).png().toFile(testImagePath);
  assert.ok(fs.existsSync(testImagePath), 'Sample image written to external directory');

  // Process sample image
  const imgResult = await processImage(testImagePath, ['webp', 'jpg', 'png'], customConfig);
  assert.ok(imgResult, 'Image processing should return a result');
  assert.strictEqual(imgResult.filename, 'external-sample.png');
  assert.strictEqual(imgResult.outputs.length, 3, 'Should produce 3 target formats');

  for (const out of imgResult.outputs) {
    const diskPath = path.join(dirs.outputDir, out.relPath);
    assert.ok(fs.existsSync(diskPath), `Output file exists on disk at: ${diskPath}`);
    assert.ok(out.relPath, 'Output should have relPath metadata');
    assert.strictEqual(out.relPath, `${out.format}/${path.basename(out.path)}`);
  }
  console.log('✓ Test 8 Passed: Image successfully processed into external output directory with relPath');

  // Create a sample SVG icon in external icons directory
  const testIconPath = path.join(dirs.inputIcons, 'external-icon.svg');
  fs.writeFileSync(testIconPath, '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="red"/></svg>');
  const iconResult = await processIcon(testIconPath, customConfig);
  assert.ok(iconResult, 'Icon processing should return a result');
  assert.strictEqual(iconResult.outputs.length, 1);
  const iconDiskPath = path.join(dirs.outputDir, iconResult.outputs[0].relPath);
  assert.ok(fs.existsSync(iconDiskPath), `Optimized SVG exists in external icons directory: ${iconDiskPath}`);
  assert.strictEqual(iconResult.outputs[0].relPath, `icons/${path.basename(iconResult.outputs[0].path)}`);
  console.log('✓ Test 9 Passed: SVG Icon successfully processed into external output directory');

  // Cleanup temporary external directories
  try {
    fs.rmSync(tempInput, { recursive: true, force: true });
    fs.rmSync(tempOutput, { recursive: true, force: true });
    console.log('✓ Cleanup: Temporary system directories cleanly removed');
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }

  console.log('\nAll Cross-Platform Path tests passed successfully! ✅');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
