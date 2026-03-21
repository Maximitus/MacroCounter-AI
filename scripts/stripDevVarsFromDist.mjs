/**
 * The Cloudflare Vite plugin may emit `.dev.vars` under `dist/` during `vite build` for local preview.
 * Never upload that file — production uses `wrangler secret put GEMINI_API_KEY` / dashboard secrets.
 * Run this immediately before `wrangler deploy`.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (name.name === '.dev.vars') {
      fs.unlinkSync(p);
      console.log('[strip-dev-vars] removed', path.relative(root, p));
    }
  }
}

walk(dist);
