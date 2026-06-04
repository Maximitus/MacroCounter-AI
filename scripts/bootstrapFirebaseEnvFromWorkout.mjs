/**
 * Copy VITE_FIREBASE_* from Workout-AI/.env.local into MacroCounter-AI/.env.local.
 * You must set VITE_FIREBASE_APP_ID to the Macro Counter web app id (Firebase Console).
 *
 * Usage: node scripts/bootstrapFirebaseEnvFromWorkout.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const macroRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const workoutEnvPath = path.join(macroRoot, '..', 'Workout-AI', '.env.local');
const macroEnvPath = path.join(macroRoot, '.env.local');

if (!fs.existsSync(workoutEnvPath)) {
  console.error('Missing Workout-AI/.env.local — complete Workout step 8 first.');
  process.exit(1);
}

const lines = fs.readFileSync(workoutEnvPath, 'utf8').split(/\r?\n/);
const vars = new Map();
for (const line of lines) {
  const m = line.match(/^(VITE_FIREBASE_\w+)\s*=\s*(.*)$/);
  if (m) vars.set(m[1], m[2].trim());
}

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = required.filter((k) => !vars.get(k)?.length);
if (missing.length) {
  console.error('Workout .env.local is missing:', missing.join(', '));
  process.exit(1);
}

let macroAppId = vars.get('VITE_FIREBASE_APP_ID');
const existingMacro = fs.existsSync(macroEnvPath)
  ? fs.readFileSync(macroEnvPath, 'utf8')
  : '';
const existingAppId = existingMacro.match(/^VITE_FIREBASE_APP_ID\s*=\s*(.+)$/m)?.[1]?.trim();
if (existingAppId && existingAppId !== macroAppId) {
  macroAppId = existingAppId;
  console.log('Keeping your existing VITE_FIREBASE_APP_ID from Macro .env.local');
} else {
  console.warn(
    'WARNING: Copied Workout VITE_FIREBASE_APP_ID. Replace with Macro Counter web app id from Firebase Console.',
  );
}

const out = [
  '# Macro Counter — same Firebase project as Workout; APP_ID must be Macro web app',
  ...required.map((k) => {
    const v = k === 'VITE_FIREBASE_APP_ID' ? macroAppId : vars.get(k);
    return `${k}=${v}`;
  }),
  '',
].join('\n');

fs.writeFileSync(macroEnvPath, out);
console.log('Wrote', macroEnvPath);
console.log('Edit VITE_FIREBASE_APP_ID if it still matches Workout, then: npm run dev');
