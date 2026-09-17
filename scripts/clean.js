import fs from 'node:fs';
import path from 'node:path';
import { getDirs } from './engine.ts';

const dirs = getDirs();
const subdirs = ['webp', 'avif', 'jpg', 'png', 'pdf', 'icons'];

for (const sub of subdirs) {
  const target = path.join(dirs.outputDir, sub);
  if (fs.existsSync(target)) {
    for (const f of fs.readdirSync(target)) {
      if (f !== '.gitkeep') {
        fs.rmSync(path.join(target, f), { recursive: true, force: true });
      }
    }
  }
}

if (fs.existsSync(dirs.statsFile)) {
  fs.rmSync(dirs.statsFile, { force: true });
}

console.log('✨ Output directory cleaned successfully.');
