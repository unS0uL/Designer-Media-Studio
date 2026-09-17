import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pc from 'picocolors';
import { processImage, processIcon } from '../scripts/engine.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const inputImagesDir = path.resolve(rootDir, 'input/images');
const inputIconsDir = path.resolve(rootDir, 'input/icons');
const outputDir = path.resolve(rootDir, 'output');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(pc.green(`  ✔ PASS: `) + message);
    passedTests++;
  } else {
    console.error(pc.red(`  ✖ FAIL: `) + pc.bold(message));
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log(pc.bold(pc.cyan('\n🧪 Running Designer Media Studio Transparency & Engine Test Suite...\n')));

  // Ensure directories
  fs.mkdirSync(inputImagesDir, { recursive: true });
  fs.mkdirSync(inputIconsDir, { recursive: true });

  // -------------------------------------------------------------
  // Test 1: Synthetic Transparent RGBA PNG
  // -------------------------------------------------------------
  console.log(pc.bold('▶ Test 1: Transparent PNG with Semi-Transparency and Gradient'));
  const testPngPath = path.join(inputImagesDir, 'test-transparency.png');

  // Create a 200x200 image:
  // - Background is 100% transparent (alpha 0)
  // - Center circle has gold color (alpha 255)
  // - Ring around center has 50% opacity (alpha 128)
  const width = 200;
  const height = 200;
  const rawRgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - 100;
      const dy = y - 100;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 40) {
        // Inner circle (Gold, 100% opaque)
        rawRgba[idx] = 197;     // R
        rawRgba[idx + 1] = 160; // G
        rawRgba[idx + 2] = 89;  // B
        rawRgba[idx + 3] = 255; // Alpha
      } else if (dist < 70) {
        // Outer ring (Gold, 50% semi-transparent)
        rawRgba[idx] = 197;
        rawRgba[idx + 1] = 160;
        rawRgba[idx + 2] = 89;
        rawRgba[idx + 3] = 128;
      } else {
        // Background (100% transparent)
        rawRgba[idx] = 0;
        rawRgba[idx + 1] = 0;
        rawRgba[idx + 2] = 0;
        rawRgba[idx + 3] = 0;
      }
    }
  }

  await sharp(rawRgba, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(testPngPath);

  assert(fs.existsSync(testPngPath), 'Created test-transparency.png in input/images');

  // Process through engine
  const res = await processImage(testPngPath, ['png', 'webp', 'avif', 'jpg']);
  assert(res !== null, 'processImage completed successfully');

  // Verify PNG output
  const outPngPath = path.join(outputDir, 'png', 'test-transparency.png');
  assert(fs.existsSync(outPngPath), 'output/png/test-transparency.png generated');
  const metaPng = await sharp(outPngPath).metadata();
  assert(metaPng.hasAlpha === true, 'PNG output preserves hasAlpha = true');
  const { data: rawPng } = await sharp(outPngPath).raw().toBuffer({ resolveWithObject: true });
  assert(rawPng[3] === 0, 'PNG corner pixel (0,0) has alpha = 0 (transparency intact)');

  // Verify WebP output
  const outWebpPath = path.join(outputDir, 'webp', 'test-transparency.webp');
  assert(fs.existsSync(outWebpPath), 'output/webp/test-transparency.webp generated');
  const metaWebp = await sharp(outWebpPath).metadata();
  assert(metaWebp.hasAlpha === true, 'WebP output preserves hasAlpha = true');
  const { data: rawWebp } = await sharp(outWebpPath).raw().toBuffer({ resolveWithObject: true });
  assert(rawWebp[3] === 0, 'WebP corner pixel (0,0) has alpha = 0 (transparency intact)');

  // Verify AVIF output
  const outAvifPath = path.join(outputDir, 'avif', 'test-transparency.avif');
  assert(fs.existsSync(outAvifPath), 'output/avif/test-transparency.avif generated');
  const metaAvif = await sharp(outAvifPath).metadata();
  assert(metaAvif.hasAlpha === true, 'AVIF output preserves hasAlpha = true');
  const { data: rawAvif } = await sharp(outAvifPath).raw().toBuffer({ resolveWithObject: true });
  assert(rawAvif[3] === 0, 'AVIF corner pixel (0,0) has alpha = 0 (transparency intact)');

  // Verify JPEG output (Must be flattened to white, NOT black)
  const outJpgPath = path.join(outputDir, 'jpg', 'test-transparency.jpg');
  assert(fs.existsSync(outJpgPath), 'output/jpg/test-transparency.jpg generated');
  const metaJpg = await sharp(outJpgPath).metadata();
  assert(metaJpg.hasAlpha === false, 'JPEG has no alpha channel (as expected)');
  const { data: rawJpg } = await sharp(outJpgPath).raw().toBuffer({ resolveWithObject: true });
  // Corner pixel was transparent in source; in JPEG it must be WHITE (R,G,B > 240), not BLACK!
  const isJpgWhite = rawJpg[0] > 240 && rawJpg[1] > 240 && rawJpg[2] > 240;
  assert(isJpgWhite, `JPEG flattened transparent background to white (#ffffff) [R:${rawJpg[0]}, G:${rawJpg[1]}, B:${rawJpg[2]}], NOT black`);

  // -------------------------------------------------------------
  // Test 2: Icon Transparency (SVG & PNG)
  // -------------------------------------------------------------
  console.log(pc.bold('\n▶ Test 2: Transparent SVG and PNG Icons (STRICT Format Preservation)'));

  // SVG Icon
  const testSvgPath = path.join(inputIconsDir, 'test-transparent-icon.svg');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <!-- Transparent SVG icon with path -->
    <path d="M50 10 L90 90 L10 90 Z" fill="#c5a059" />
  </svg>`;
  fs.writeFileSync(testSvgPath, svgContent, 'utf8');

  const svgRes = await processIcon(testSvgPath);
  assert(svgRes !== null, 'processIcon SVG completed');
  const outSvgPath = path.join(outputDir, 'icons', 'test-transparent-icon.svg');
  assert(fs.existsSync(outSvgPath), 'output/icons/test-transparent-icon.svg generated');
  const optimizedSvg = fs.readFileSync(outSvgPath, 'utf8');
  assert(optimizedSvg.includes('viewBox'), 'SVG preserves viewBox attribute');
  assert(!optimizedSvg.includes('comment'), 'SVG cleaned up comments');

  // PNG Icon
  const testPngIconPath = path.join(inputIconsDir, 'test-icon.png');
  await sharp(rawRgba, { raw: { width: 200, height: 200, channels: 4 } })
    .png()
    .toFile(testPngIconPath);

  const pngIconRes = await processIcon(testPngIconPath);
  assert(pngIconRes !== null, 'processIcon PNG completed');
  const outPngIconPath = path.join(outputDir, 'icons', 'test-icon.png');
  assert(fs.existsSync(outPngIconPath), 'output/icons/test-icon.png generated');
  const metaPngIcon = await sharp(outPngIconPath).metadata();
  assert(metaPngIcon.hasAlpha === true, 'PNG Icon preserves hasAlpha = true');

  // -------------------------------------------------------------
  // Cleanup Test Files
  // -------------------------------------------------------------
  if (fs.existsSync(testPngPath)) fs.rmSync(testPngPath, { force: true });
  if (fs.existsSync(testSvgPath)) fs.rmSync(testSvgPath, { force: true });
  if (fs.existsSync(testPngIconPath)) fs.rmSync(testPngIconPath, { force: true });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log(pc.bold(pc.cyan('\n----------------------------------------')));
  if (passedTests === totalTests) {
    console.log(pc.bold(pc.green(`🎉 ALL ${totalTests} TESTS PASSED SUCCESSFULLY!`)));
  } else {
    console.error(pc.bold(pc.red(`❌ ${totalTests - passedTests} OF ${totalTests} TESTS FAILED.`)));
  }
  console.log(pc.bold(pc.cyan('----------------------------------------\n')));
}

runTests().catch(err => {
  console.error(pc.red('Test suite fatal error:'), err);
  process.exit(1);
});
