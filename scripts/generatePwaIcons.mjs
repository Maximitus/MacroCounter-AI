/**
 * Rasterize public/icons/*.svg into PNG launcher icons (committed for deploy).
 * Run: npm run icons
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = path.join(root, 'public', 'icons');

async function rasterize(svgFile, outFile, size) {
  const svgPath = path.join(iconsDir, svgFile);
  const outPath = path.join(iconsDir, outFile);
  await sharp(fs.readFileSync(svgPath)).resize(size, size).png().toFile(outPath);
  console.log(`  ${outFile} (${size}×${size})`);
}

async function main() {
  console.log('Generating PWA icons in public/icons/…');
  await rasterize('icon-any.svg', 'icon-192.png', 192);
  await rasterize('icon-any.svg', 'icon-512.png', 512);
  await rasterize('icon-maskable.svg', 'icon-maskable-192.png', 192);
  await rasterize('icon-maskable.svg', 'icon-maskable-512.png', 512);
  await rasterize('icon-any.svg', 'apple-touch-icon.png', 180);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
