import fs from 'node:fs';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {fileURLToPath} from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

import {cloudflare} from '@cloudflare/vite-plugin';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const CHAT_PATH = '/macrocounter/api/chat';

/** Read GEMINI_API_KEY from `.dev.vars` (wrangler format). Handles UTF-16 LE (some Windows editors). */
function readGeminiKeyFromDevVarsFile(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const buf = fs.readFileSync(filePath);
  let text: string;
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    text = buf.slice(2).toString('utf16le');
  } else {
    text = buf.toString('utf8').replace(/^\uFEFF/, '');
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^GEMINI_API_KEY\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
}

/**
 * Miniflare (vite dev) often does not pass `.dev.vars` into `env.GEMINI_API_KEY` for the Worker.
 * Intercept chat in Node during `vite dev` only; production still uses `worker/index.ts` + secrets.
 */
function resolveGeminiKeyForDev(): string | undefined {
  const fromProcess = process.env.GEMINI_API_KEY?.trim();
  if (fromProcess) return fromProcess;
  const fromViteEnv = loadEnv('development', rootDir, '').GEMINI_API_KEY?.trim();
  if (fromViteEnv) return fromViteEnv;
  return readGeminiKeyFromDevVarsFile(path.join(rootDir, '.dev.vars'));
}

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

type ConnectLayer = {route: string; handle: ConnectHandle};
type ConnectHandle = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => void;

function geminiChatDevMiddlewarePlugin(): Plugin {
  let keyWhenReady: string | undefined;
  return {
    name: 'gemini-chat-dev-proxy',
    apply: 'serve',
    enforce: 'post',
    configureServer(server) {
      async function handle(
        req: IncomingMessage,
        res: ServerResponse,
        next: (err?: unknown) => void,
      ) {
        try {
          if (req.method !== 'POST') {
            next();
            return;
          }
          let pathname = (req.url ?? '').split('?')[0];
          try {
            pathname = decodeURIComponent(pathname);
          } catch {
            /* keep raw */
          }
          const isChat =
            pathname === CHAT_PATH ||
            pathname === `${CHAT_PATH}/` ||
            pathname === '/api/chat' ||
            pathname === '/api/chat/';
          if (!isChat) {
            next();
            return;
          }

          const apiKey = keyWhenReady ?? resolveGeminiKeyForDev();
          if (!apiKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: {
                  message:
                    'Missing GEMINI_API_KEY (local dev: set in .dev.vars or .env.local at project root)',
                },
              }),
            );
            return;
          }

          let body: Record<string, unknown>;
          try {
            const raw = await readRequestBody(req);
            body = JSON.parse(raw.toString('utf8')) as Record<string, unknown>;
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: {message: 'Invalid JSON body'}}));
            return;
          }

          const model =
            (typeof body.model === 'string' && body.model) || 'gemini-3-flash-preview';
          const {model: _m, ...geminiBody} = body;

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(geminiBody),
            });
            const text = await response.text();
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('x-macrocounter-chat-proxy', 'vite-dev');
            res.end(text);
          } catch {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: {message: 'Gemini request failed'}}));
          }
        } catch {
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: {message: 'Chat proxy error'}}));
          }
        }
      }

      return () => {
        keyWhenReady = resolveGeminiKeyForDev();
        const stack = (server.middlewares as {stack?: ConnectLayer[]}).stack;
        if (!stack) return;
        if (stack.some((l) => l.handle === handle)) return;
        stack.unshift({route: '', handle});
      };
    },
  };
}

export default defineConfig(({command}) => ({
  base: '/macrocounter/',
  plugins: [
    geminiChatDevMiddlewarePlugin(),
    react(),
    tailwindcss(),
    cloudflare(
      command === 'serve'
        ? {
            // Dev: only run Worker first for API paths. `run_worker_first: true` + missing ASSETS
            // caused errors; `fetch(request)` fallback causes workerd "internal error".
            config: (cfg) => ({
              assets: {
                ...cfg.assets,
                run_worker_first: ['/macrocounter/api/*', '/api/*'],
              },
            }),
          }
        : {},
    ),
  ],
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify - file watching is disabled to prevent flickering during agent edits.
    hmr: process.env.DISABLE_HMR !== 'true',
  },
}));
