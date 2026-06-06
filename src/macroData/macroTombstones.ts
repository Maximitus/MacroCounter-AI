import type {FavoriteEntry, MacroDataBundle, MacroTombstones, MealEntry} from './macroTypes.ts';

export type {MacroTombstones};

function unionUnique(...arrays: (string[] | undefined)[]): string[] | undefined {
  const set = new Set<string>();
  for (const arr of arrays) {
    if (!arr) continue;
    for (const value of arr) set.add(value);
  }
  if (set.size === 0) return undefined;
  return [...set].sort();
}

export function normalizeTombstones(raw: MacroTombstones | undefined | null): MacroTombstones | undefined {
  if (!raw) return undefined;
  const out: MacroTombstones = {
    history: unionUnique(raw.history),
    favorites: unionUnique(raw.favorites),
    dailyLog: unionUnique(raw.dailyLog),
    weightLog: unionUnique(raw.weightLog),
  };
  if (!out.history?.length) delete out.history;
  if (!out.favorites?.length) delete out.favorites;
  if (!out.dailyLog?.length) delete out.dailyLog;
  if (!out.weightLog?.length) delete out.weightLog;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mergeTombstones(
  ...sources: (MacroTombstones | undefined | null)[]
): MacroTombstones | undefined {
  return normalizeTombstones({
    history: sources.flatMap((source) => source?.history ?? []),
    favorites: sources.flatMap((source) => source?.favorites ?? []),
    dailyLog: sources.flatMap((source) => source?.dailyLog ?? []),
    weightLog: sources.flatMap((source) => source?.weightLog ?? []),
  });
}

export function tombstonesFromFirestore(raw: unknown): MacroTombstones | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const readIds = (key: string): string[] | undefined => {
    const value = record[key];
    if (!Array.isArray(value)) return undefined;
    const ids = value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
    return ids.length > 0 ? ids : undefined;
  };
  return normalizeTombstones({
    history: readIds('history'),
    favorites: readIds('favorites'),
    dailyLog: readIds('dailyLog'),
    weightLog: readIds('weightLog'),
  });
}

export function computeDeletionTombstones(
  baseline: MacroDataBundle | null,
  current: MacroDataBundle,
): MacroTombstones | undefined {
  if (!baseline) return undefined;

  const history: string[] = [];
  const favorites: string[] = [];
  const dailyLog: string[] = [];
  const weightLog: string[] = [];

  const currentHistoryIds = new Set(current.history.map((entry) => entry.id));
  for (const entry of baseline.history) {
    if (!currentHistoryIds.has(entry.id)) history.push(entry.id);
  }

  const currentFavoriteNames = new Set(current.favorites.map((entry) => entry.name));
  for (const entry of baseline.favorites) {
    if (!currentFavoriteNames.has(entry.name)) favorites.push(entry.name);
  }

  for (const key of Object.keys(baseline.dailyLog)) {
    if (!(key in current.dailyLog)) dailyLog.push(key);
  }

  for (const key of Object.keys(baseline.weightLog)) {
    if (!(key in current.weightLog)) weightLog.push(key);
  }

  return normalizeTombstones({history, favorites, dailyLog, weightLog});
}

export type MacroTombstoneLookup = {
  history: Set<string>;
  favorites: Set<string>;
  dailyLog: Set<string>;
  weightLog: Set<string>;
};

export function tombstoneLookup(tombstones: MacroTombstones | undefined): MacroTombstoneLookup {
  return {
    history: new Set(tombstones?.history ?? []),
    favorites: new Set(tombstones?.favorites ?? []),
    dailyLog: new Set(tombstones?.dailyLog ?? []),
    weightLog: new Set(tombstones?.weightLog ?? []),
  };
}

export function favoriteKey(entry: FavoriteEntry): string {
  return entry.name;
}

export function mealKey(entry: MealEntry): string {
  return entry.id;
}
