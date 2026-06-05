/**
 * Push VITE_FIREBASE_* from .env.local to Cloudflare Workers **Build** variables
 * (so git-push / Workers Builds embed Firebase in the Vite bundle).
 *
 * Worker: macrocounter-ai (Macro VITE_FIREBASE_APP_ID — not Workout's).
 *
 * Usage (PowerShell):
 *   $env:CLOUDFLARE_API_TOKEN = "your-token"
 *   npm run cf:push-build-env
 */
import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env.local');
const WORKER_NAME = 'macrocounter-ai';

const FIREBASE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

function readEnvLocal() {
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env.local — add VITE_FIREBASE_* first.');
    process.exit(1);
  }
  const text = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(VITE_FIREBASE_\w+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function accountIdFromWhoami() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
    return process.env.CLOUDFLARE_ACCOUNT_ID.trim();
  }
  try {
    const out = execSync('npx wrangler whoami', {cwd: root, encoding: 'utf8'});
    const labeled = out.match(/Account ID:\s*([a-f0-9]+)/i);
    if (labeled) return labeled[1];
    const table = out.match(/\│\s*[^│]+\s*\│\s*([a-f0-9]{32})\s*\│/);
    if (table) return table[1];
  } catch {
    /* not logged in */
  }
  return null;
}

async function cfApi(token, accountId, method, apiPath, body) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}${apiPath}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const json = await res.json();
  if (!json.success) {
    throw new Error(JSON.stringify(json.errors ?? json, null, 2));
  }
  return json.result;
}

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) {
    console.error('Set CLOUDFLARE_API_TOKEN (same token as Workout — Workers Builds Configuration → Edit).');
    process.exit(1);
  }

  const accountId = accountIdFromWhoami();
  if (!accountId) {
    console.error('Could not read Account ID. Set CLOUDFLARE_ACCOUNT_ID or run: npx wrangler login');
    process.exit(1);
  }

  const local = readEnvLocal();
  const missing = FIREBASE_KEYS.filter((k) => !local[k]?.length);
  if (missing.length) {
    console.error('.env.local missing:', missing.join(', '));
    process.exit(1);
  }

  const envPayload = {};
  for (const key of FIREBASE_KEYS) {
    envPayload[key] = {value: local[key], is_secret: false};
  }

  console.log(`Account: ${accountId}`);
  console.log(`Worker: ${WORKER_NAME}`);

  const scripts = await cfApi(token, accountId, 'GET', '/workers/scripts');
  const worker = scripts.find((s) => s.id === WORKER_NAME);
  if (!worker?.tag) {
    console.error(`Worker "${WORKER_NAME}" not found. Is Workers Builds set up for this worker?`);
    process.exit(1);
  }

  const triggers = await cfApi(
    token,
    accountId,
    'GET',
    `/builds/workers/${worker.tag}/triggers`,
  );

  if (!triggers?.length) {
    console.error('No build triggers found. Connect Git in Dashboard → macrocounter-ai → Settings → Build.');
    process.exit(1);
  }

  let updated = 0;
  for (const trigger of triggers) {
    const uuid = trigger.trigger_uuid ?? trigger.uuid ?? trigger.id;
    const name = trigger.trigger_name ?? trigger.name ?? uuid;
    if (!uuid) continue;

    await cfApi(
      token,
      accountId,
      'PATCH',
      `/builds/triggers/${uuid}/environment_variables`,
      envPayload,
    );
    console.log(`Updated build env on trigger: ${name}`);
    updated += 1;
  }

  if (updated === 0) {
    console.error('Found build triggers but could not update any (missing trigger UUID).');
    process.exit(1);
  }

  console.log('Done. Retry deployment or push — Firebase should be in the build.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
