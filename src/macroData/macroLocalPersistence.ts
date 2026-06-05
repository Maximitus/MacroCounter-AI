import type {MacroDataBundle, MacroTotals} from './macroTypes.ts';

export const STORAGE_BUNDLE_UPDATED_AT = 'macrocounter_bundle_updated_at_v1';

function ceilToOneDecimal(n: number): number {
  return Math.ceil(n * 10) / 10;
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

export function macroBundleFingerprint(bundle: MacroDataBundle): string {
  return JSON.stringify({
    macros: bundle.macros,
    goals: bundle.goals,
    dailyLog: bundle.dailyLog,
    weightGoal: bundle.weightGoal,
    weightLog: bundle.weightLog,
    favorites: bundle.favorites,
    history: bundle.history,
    lastUpdatedDate: bundle.lastUpdatedDate,
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

export function loadLocalMacroBundleRaw(): Omit<MacroDataBundle, 'schemaVersion'> {
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

  return {
    macros,
    goals,
    dailyLog,
    weightGoal: loadWeightGoal(),
    weightLog: loadWeightLog(),
    favorites,
    history,
    lastUpdatedDate,
  };
}

export function saveLocalMacroBundle(bundle: MacroDataBundle, atMs = Date.now()) {
  try {
    localStorage.setItem('macros', JSON.stringify(bundle.macros));
    localStorage.setItem('goals', JSON.stringify(bundle.goals));
    localStorage.setItem('dailyLog', JSON.stringify(bundle.dailyLog));
    localStorage.setItem('weightGoal', JSON.stringify(bundle.weightGoal));
    localStorage.setItem('weightLog', JSON.stringify(bundle.weightLog));
    localStorage.setItem('favorites', JSON.stringify(bundle.favorites));
    localStorage.setItem('history', JSON.stringify(bundle.history));
    localStorage.setItem('lastUpdatedDate', bundle.lastUpdatedDate);
    markLocalBundleUpdatedAt(atMs);
  } catch {
    /* ignore quota */
  }
}
