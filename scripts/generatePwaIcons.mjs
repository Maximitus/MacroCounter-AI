/**
 * Rasterize public/icons/*.svg into PNGs for the web app manifest.
 * Run: npm run icons
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconsDir = path.join(rootDir, 'public', 'icons');

const jobs = [
  {src: 'icon-any.svg', out: 'icon-192.png', size: 192},
  {src: 'icon-any.svg', out: 'icon-512.png', size: 512},
  {src: 'icon-maskable.svg', out: 'icon-maskable-192.png', size: 192},
  {src: 'icon-maskable.svg', out: 'icon-maskable-512.png', size: 512},
  {src: 'icon-any.svg', out: 'apple-touch-icon.png', size: 180},
];

for (const {src, out, size} of jobs) {
  const input = path.join(iconsDir, src);
  const output = path.join(iconsDir, out);
  await sharp(input).resize(size, size).png().toFile(output);
  console.log(`wrote ${path.relative(rootDir, output)} (${size}x${size})`);
}
