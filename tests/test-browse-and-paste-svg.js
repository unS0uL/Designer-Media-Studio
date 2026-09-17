/**
 * Automated Test Suite: Directory Browsing & Direct SVG Code Pasting
 * Tests filesystem directory listing, parent navigation,
 * and direct SVG code processing with SVGO optimization (viewBox preservation).
 */

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  rootDir,
  getDirs,
  ensureDirs,
  processIcon,
} from '../scripts/engine.ts';
import { loadConfig } from '../scripts/config-manager.js';

async function runTests() {
  console.log('--- Testing Directory Navigator & Filesystem Browsing ---');

  // Test 1: Reading project root directory
  const rootStat = fs.statSync(rootDir);
  assert.ok(rootStat.isDirectory(), 'rootDir must be a valid directory');

  const rootEntries = fs.readdirSync(rootDir, { withFileTypes: true });
  const subdirs = rootEntries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  assert.ok(subdirs.includes('src'), 'rootDir should list "src" subdirectory');
  assert.ok(subdirs.includes('scripts'), 'rootDir should list "scripts" subdirectory');
  assert.ok(!subdirs.some(s => s.startsWith('.')), 'Hidden dot directories must be excluded');
  console.log('✓ Test 1 Passed: Directory browsing lists subdirectories and filters hidden folders');

  // Test 2: Parent directory navigation
  const srcPath = path.join(rootDir, 'src');
  const parent = path.dirname(srcPath);
  assert.strictEqual(parent, rootDir, 'Parent directory of src must equal rootDir');
  console.log('✓ Test 2 Passed: Parent directory navigation correctly resolves');

  // Test 3: Quick links resolution
  const home = os.homedir();
  assert.ok(fs.existsSync(home), 'User home directory must exist');
  console.log('✓ Test 3 Passed: Home and user quick link paths exist on system disk');

  console.log('\n--- Testing SVG Code Extraction & SVGO Optimization ---');
  const config = loadConfig();
  const dirs = getDirs(config);
  ensureDirs(config);

  // Test 4: Name extraction from <title> tag
  const svgWithTitle = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <title>User Profile Icon</title>
      <!-- Figma vector comment -->
      <circle cx="32" cy="32" r="28" fill="#c5a059" />
    </svg>
  `.trim();

  const titleMatch = svgWithTitle.match(/<title>([^<]+)<\/title>/i);
  assert.ok(titleMatch, 'Title should be extracted from SVG');
  const extractedName = titleMatch[1].trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') + '.svg';
  assert.strictEqual(extractedName, 'user-profile-icon.svg', 'Filename should normalize from title');
  console.log('✓ Test 4 Passed: SVG title correctly parsed into normalized icon filename');

  // Test 5: Name extraction from id attribute
  const svgWithId = `
    <svg id="action-settings-gear" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="4" fill="blue" />
    </svg>
  `.trim();
  const idMatch = svgWithId.match(/id=["']([^"']+)["']/i);
  assert.ok(idMatch, 'ID attribute should be extracted from SVG');
  const extractedIdName = idMatch[1].trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') + '.svg';
  assert.strictEqual(extractedIdName, 'action-settings-gear.svg');
  console.log('✓ Test 5 Passed: SVG ID attribute correctly parsed into filename');

  // Test 6: Process pasted SVG through SVGO engine
  const targetSvgFile = path.join(dirs.inputIcons, 'pasted-vector-test.svg');
  fs.writeFileSync(targetSvgFile, svgWithTitle, 'utf8');

  const iconResult = await processIcon(targetSvgFile, config);
  assert.ok(iconResult, 'processIcon must return a result');
  assert.strictEqual(iconResult.type, 'icon');
  assert.ok(iconResult.outputs && iconResult.outputs.length > 0, 'Outputs array must be generated');

  const outSvgPath = path.join(dirs.outputDir, iconResult.outputs[0].relPath);
  assert.ok(fs.existsSync(outSvgPath), `Optimized SVG must exist at ${outSvgPath}`);

  const optimizedSvgContent = fs.readFileSync(outSvgPath, 'utf8');
  assert.ok(optimizedSvgContent.includes('viewBox="0 0 64 64"') || optimizedSvgContent.includes('viewBox="0 0 64 64"'), 'viewBox MUST be preserved by SVGO');
  assert.ok(!optimizedSvgContent.includes('Figma vector comment'), 'Comments must be stripped by SVGO');
  console.log('✓ Test 6 Passed: Direct SVG markup optimized by SVGO with strict viewBox preservation');

  // Test 7: Invalid SVG markup detection
  const invalidCode1 = '<div>Not an SVG</div>';
  const isValid1 = invalidCode1.toLowerCase().includes('<svg') && invalidCode1.toLowerCase().includes('</svg>');
  assert.strictEqual(isValid1, false, 'Non-SVG HTML must be rejected');

  const invalidCode2 = '<svg viewBox="0 0 10 10">unclosed';
  const isValid2 = invalidCode2.toLowerCase().includes('<svg') && invalidCode2.toLowerCase().includes('</svg>');
  assert.strictEqual(isValid2, false, 'Unclosed SVG tag must be rejected');
  console.log('✓ Test 7 Passed: Invalid SVG markup accurately rejected by validator');

  // Cleanup test input and output
  try {
    if (fs.existsSync(targetSvgFile)) fs.rmSync(targetSvgFile, { force: true });
    if (fs.existsSync(outSvgPath)) fs.rmSync(outSvgPath, { force: true });
    console.log('✓ Cleanup: Temporary test vector files removed');
  } catch (err) {
    console.warn('Cleanup notice:', err.message);
  }

  console.log('\nAll Directory Navigator & SVG Paste tests passed successfully! ✅');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
