import {filterTodayMealHistory} from './mealHistory.ts';
import {normalizeTombstones} from './macroTombstones.ts';
import type {MacroDataBundle, MacroTotals} from './macroTypes.ts';

export const STORAGE_BUNDLE_UPDATED_AT = 'macrocounter_bundle_updated_at_v1';
export const STORAGE_TOMBSTONES = 'macrocounter_tombstones_v1';

function sortRecordKeys<T>(record: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {};
  for (const k of Object.keys(record).sort()) sorted[k] = record[k];
  return sorted;
}

/** Deterministic JSON — object key order does not affect the fingerprint. */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value as object).sort();
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`,
  );
  return `{${pairs.join(',')}}`;
}

function lastSyncFingerprintKey(uid: string) {
  return `macrocounter_last_sync_fp_v2_${uid}`;
}

export function getLastSyncFingerprint(uid: string): string | null {
  try {
    return localStorage.getItem(lastSyncFingerprintKey(uid));
  } catch {
    return null;
  }
}

export function setLastSyncFingerprint(uid: string, fingerprint: string) {
  try {
    localStorage.setItem(lastSyncFingerprintKey(uid), fingerprint);
  } catch {
    /* ignore quota */
  }
}

function lastSyncedBundleKey(uid: string) {
  return `macrocounter_last_sync_bundle_v1_${uid}`;
}

export function getLastSyncedBundle(uid: string): MacroDataBundle | null {
  try {
    const raw = localStorage.getItem(lastSyncedBundleKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MacroDataBundle;
    return canonicalMacroBundle(parsed);
  } catch {
    return null;
  }
}

export function setLastSyncedBundle(uid: string, bundle: MacroDataBundle) {
  try {
    localStorage.setItem(lastSyncedBundleKey(uid), JSON.stringify(canonicalMacroBundle(bundle)));
  } catch {
    /* ignore quota */
  }
}

function ceilToOneDecimal(n: number): number {
  return Math.ceil(n * 10) / 10;
}

function normalizeWeightLog(weightLog: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(weightLog)) {
    const num = typeof v === 'number' ? v : parseFloat(String(v));
    if (Number.isFinite(num) && num > 0) next[k] = ceilToOneDecimal(num);
  }
  return next;
}

function normalizeMacroTotals(t: MacroTotals): MacroTotals {
  return {
    calories: Math.round(Number(t.calories) || 0),
    protein: Math.round(Number(t.protein) || 0),
    carbs: Math.round(Number(t.carbs) || 0),
    fat: Math.round(Number(t.fat) || 0),
  };
}

function normalizeDailyLog(dailyLog: Record<string, MacroTotals>): Record<string, MacroTotals> {
  const next: Record<string, MacroTotals> = {};
  for (const k of Object.keys(dailyLog).sort()) {
    next[k] = normalizeMacroTotals(dailyLog[k] ?? {calories: 0, protein: 0, carbs: 0, fat: 0});
  }
  return next;
}

/** Strip undefined / Firestore-vs-local JSON noise before compare. */
export function canonicalMacroBundle(bundle: MacroDataBundle): MacroDataBundle {
  const tombstones = normalizeTombstones(bundle.tombstones);
  return JSON.parse(
    JSON.stringify({
      schemaVersion: bundle.schemaVersion ?? 1,
      macros: normalizeMacroTotals(bundle.macros),
      goals: normalizeMacroTotals(bundle.goals),
      dailyLog: normalizeDailyLog(bundle.dailyLog),
      weightGoal:
        typeof bundle.weightGoal === 'number' && Number.isFinite(bundle.weightGoal)
          ? Math.round(bundle.weightGoal * 10) / 10
          : 0,
      weightLog: sortRecordKeys(normalizeWeightLog(bundle.weightLog)),
      favorites: [...bundle.favorites].sort((a, b) => a.name.localeCompare(b.name)),
      history: filterTodayMealHistory(bundle.history).sort((a, b) => a.id.localeCompare(b.id)),
      lastUpdatedDate: bundle.lastUpdatedDate ?? '',
      ...(tombstones ? {tombstones} : {}),
    }),
  ) as MacroDataBundle;
}

export function markLocalBundleUpdatedAt(atMs = Date.now()) {
  try {
    localStorage.setItem(STORAGE_BUNDLE_UPDATED_AT, String(atMs));
  } catch {
    /* ignore quota */
  }
}

export function getLocalBundleUpdatedAtMs(): number {
  try {
    const raw = localStorage.getItem(STORAGE_BUNDLE_UPDATED_AT);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Compact fingerprint for comparing local vs remote bundles. */
export function macroBundleFingerprint(bundle: MacroDataBundle): string {
  const c = canonicalMacroBundle(bundle);
  return stableStringify({
    macros: c.macros,
    goals: c.goals,
    dailyLog: c.dailyLog,
    weightGoal: c.weightGoal,
    weightLog: c.weightLog,
    favorites: c.favorites,
    history: c.history,
    lastUpdatedDate: c.lastUpdatedDate,
  });
}

function loadWeightGoal(): number {
  try {
    const saved = localStorage.getItem('weightGoal');
    if (!saved) return 0;
    const n = parseFloat(saved);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function loadWeightLog(): Record<string, number> {
  try {
    const saved = localStorage.getItem('weightLog');
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const num = typeof v === 'number' ? v : parseFloat(String(v));
      if (Number.isFinite(num) && num > 0) next[k] = ceilToOneDecimal(num);
    }
    return next;
  } catch {
    return {};
  }
}

export function loadLocalMacroBundleRaw(): MacroDataBundle {
  let macros: MacroTotals = {calories: 0, protein: 0, carbs: 0, fat: 0};
  let goals: MacroTotals = {calories: 2000, protein: 150, carbs: 200, fat: 70};
  let dailyLog: Record<string, MacroTotals> = {};
  let favorites: MacroDataBundle['favorites'] = [];
  let history: MacroDataBundle['history'] = [];
  let lastUpdatedDate = new Date().toDateString();

  try {
    const saved = localStorage.getItem('macros');
    if (saved) macros = JSON.parse(saved) as MacroTotals;
  } catch {
    /* ignore */
  }

  try {
    const saved = localStorage.getItem('goals');
    if (saved) goals = JSON.parse(saved) as MacroTotals;
  } catch {
    /* ignore */
  }

  try {
    const saved = localStorage.getItem('dailyLog');
    if (saved) dailyLog = JSON.parse(saved) as Record<string, MacroTotals>;
  } catch {
    /* ignore */
  }

  try {
    const saved = localStorage.getItem('favorites');
    if (saved) favorites = JSON.parse(saved) as MacroDataBundle['favorites'];
  } catch {
    /* ignore */
  }

  try {
    const saved = localStorage.getItem('history');
    if (saved) history = JSON.parse(saved) as MacroDataBundle['history'];
  } catch {
    /* ignore */
  }

  try {
    lastUpdatedDate = localStorage.getItem('lastUpdatedDate') ?? lastUpdatedDate;
  } catch {
    /* ignore */
  }

  let tombstones = undefined;
  try {
    const tombstonesRaw = localStorage.getItem(STORAGE_TOMBSTONES);
    if (tombstonesRaw) {
      tombstones = normalizeTombstones(JSON.parse(tombstonesRaw));
    }
  } catch {
    /* ignore */
  }

  return canonicalMacroBundle({
    schemaVersion: 1,
    macros,
    goals,
    dailyLog,
    weightGoal: loadWeightGoal(),
    weightLog: loadWeightLog(),
    favorites,
    history,
    lastUpdatedDate,
    tombstones,
  });
}

export function saveLocalMacroBundle(bundle: MacroDataBundle, atMs = Date.now()) {
  const canonical = canonicalMacroBundle(bundle);
  try {
    localStorage.setItem('macros', JSON.stringify(canonical.macros));
    localStorage.setItem('goals', JSON.stringify(canonical.goals));
    localStorage.setItem('dailyLog', JSON.stringify(canonical.dailyLog));
    localStorage.setItem('weightGoal', JSON.stringify(canonical.weightGoal));
    localStorage.setItem('weightLog', JSON.stringify(canonical.weightLog));
    localStorage.setItem('favorites', JSON.stringify(canonical.favorites));
    localStorage.setItem('history', JSON.stringify(canonical.history));
    localStorage.setItem('lastUpdatedDate', canonical.lastUpdatedDate);
    if (canonical.tombstones) {
      localStorage.setItem(STORAGE_TOMBSTONES, JSON.stringify(canonical.tombstones));
    } else {
      localStorage.removeItem(STORAGE_TOMBSTONES);
    }
    markLocalBundleUpdatedAt(atMs);
  } catch {
    /* ignore quota */
  }
}
