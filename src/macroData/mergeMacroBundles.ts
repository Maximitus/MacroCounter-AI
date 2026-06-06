import {canonicalMacroBundle, macroBundleFingerprint} from './macroLocalPersistence.ts';
import {favoriteKey, mergeTombstones, tombstoneLookup} from './macroTombstones.ts';
import type {FavoriteEntry, MacroDataBundle, MacroTotals, MealEntry} from './macroTypes.ts';

export type MergeMacroBundlesInput = {
  local: MacroDataBundle;
  remote: MacroDataBundle;
  baseline: MacroDataBundle | null;
  localUpdatedMs: number;
  remoteUpdatedMs: number;
};

function itemFingerprint<T>(item: T): string {
  return JSON.stringify(item);
}

function pickNewer<T>(localItem: T, remoteItem: T, localMs: number, remoteMs: number): T {
  if (itemFingerprint(localItem) === itemFingerprint(remoteItem)) return localItem;
  if (localMs <= 0 && remoteMs <= 0) return localItem;
  if (localMs <= 0) return remoteItem;
  if (remoteMs <= 0) return localItem;
  return localMs >= remoteMs ? localItem : remoteItem;
}

function mergeIdKeyed<T extends {id: string}>(
  localItems: T[],
  remoteItems: T[],
  baselineItems: T[],
  localMs: number,
  remoteMs: number,
  blockedIds: Set<string> = new Set(),
): T[] {
  const localById = new Map(localItems.map((item) => [item.id, item]));
  const remoteById = new Map(remoteItems.map((item) => [item.id, item]));
  const baselineById = new Map(baselineItems.map((item) => [item.id, item]));
  const allIds = new Set([...localById.keys(), ...remoteById.keys(), ...baselineById.keys()]);
  const merged: T[] = [];

  for (const id of allIds) {
    if (blockedIds.has(id)) continue;

    const localItem = localById.get(id);
    const remoteItem = remoteById.get(id);
    const baselineItem = baselineById.get(id);

    if (localItem && remoteItem) {
      merged.push(pickNewer(localItem, remoteItem, localMs, remoteMs));
      continue;
    }

    if (localItem && !remoteItem) {
      if (baselineItem && remoteMs > localMs) continue;
      merged.push(localItem);
      continue;
    }

    if (!localItem && remoteItem) {
      if (baselineItem && localMs > remoteMs) continue;
      merged.push(remoteItem);
    }
  }

  return merged;
}

function mergeStringKeyedRecords<T>(
  localRecord: Record<string, T>,
  remoteRecord: Record<string, T>,
  baselineRecord: Record<string, T>,
  localMs: number,
  remoteMs: number,
  blockedKeys: Set<string>,
): Record<string, T> {
  const allKeys = new Set([
    ...Object.keys(localRecord),
    ...Object.keys(remoteRecord),
    ...Object.keys(baselineRecord),
  ]);
  const merged: Record<string, T> = {};

  for (const key of allKeys) {
    if (blockedKeys.has(key)) continue;

    const hasLocal = Object.prototype.hasOwnProperty.call(localRecord, key);
    const hasRemote = Object.prototype.hasOwnProperty.call(remoteRecord, key);
    const hasBaseline = Object.prototype.hasOwnProperty.call(baselineRecord, key);
    const localValue = localRecord[key];
    const remoteValue = remoteRecord[key];

    if (hasLocal && hasRemote) {
      merged[key] = pickNewer(localValue, remoteValue, localMs, remoteMs);
      continue;
    }

    if (hasLocal && !hasRemote) {
      if (hasBaseline && remoteMs > localMs) continue;
      merged[key] = localValue;
      continue;
    }

    if (!hasLocal && hasRemote) {
      if (hasBaseline && localMs > remoteMs) continue;
      merged[key] = remoteValue;
    }
  }

  return merged;
}

function mergeFavorites(
  localFavorites: FavoriteEntry[],
  remoteFavorites: FavoriteEntry[],
  baselineFavorites: FavoriteEntry[],
  localMs: number,
  remoteMs: number,
  blockedNames: Set<string>,
): FavoriteEntry[] {
  const toKeyed = (entry: FavoriteEntry) => ({id: favoriteKey(entry), entry});
  const fromKeyed = (row: {id: string; entry: FavoriteEntry}) => row.entry;
  const merged = mergeIdKeyed(
    localFavorites.map(toKeyed),
    remoteFavorites.map(toKeyed),
    baselineFavorites.map(toKeyed),
    localMs,
    remoteMs,
    blockedNames,
  );
  return merged.map(fromKeyed);
}

function mergeMealHistory(
  localHistory: MealEntry[],
  remoteHistory: MealEntry[],
  baselineHistory: MealEntry[],
  localMs: number,
  remoteMs: number,
  blockedIds: Set<string>,
): MealEntry[] {
  return mergeIdKeyed(localHistory, remoteHistory, baselineHistory, localMs, remoteMs, blockedIds);
}

export function mergeMacroBundles({
  local,
  remote,
  baseline,
  localUpdatedMs,
  remoteUpdatedMs,
}: MergeMacroBundlesInput): MacroDataBundle {
  const localCanon = canonicalMacroBundle(local);
  const remoteCanon = canonicalMacroBundle(remote);
  const baselineCanon = baseline ? canonicalMacroBundle(baseline) : null;
  const mergedTombstones = mergeTombstones(
    localCanon.tombstones,
    remoteCanon.tombstones,
    baselineCanon?.tombstones,
  );
  const tombstones = tombstoneLookup(mergedTombstones);

  const merged: MacroDataBundle = {
    schemaVersion: Math.max(localCanon.schemaVersion, remoteCanon.schemaVersion, 1),
    macros: pickNewer(localCanon.macros, remoteCanon.macros, localUpdatedMs, remoteUpdatedMs),
    goals: pickNewer(localCanon.goals, remoteCanon.goals, localUpdatedMs, remoteUpdatedMs),
    dailyLog: mergeStringKeyedRecords(
      localCanon.dailyLog,
      remoteCanon.dailyLog,
      baselineCanon?.dailyLog ?? {},
      localUpdatedMs,
      remoteUpdatedMs,
      tombstones.dailyLog,
    ),
    weightGoal: pickNewer(
      localCanon.weightGoal,
      remoteCanon.weightGoal,
      localUpdatedMs,
      remoteUpdatedMs,
    ),
    weightLog: mergeStringKeyedRecords(
      localCanon.weightLog,
      remoteCanon.weightLog,
      baselineCanon?.weightLog ?? {},
      localUpdatedMs,
      remoteUpdatedMs,
      tombstones.weightLog,
    ),
    favorites: mergeFavorites(
      localCanon.favorites,
      remoteCanon.favorites,
      baselineCanon?.favorites ?? [],
      localUpdatedMs,
      remoteUpdatedMs,
      tombstones.favorites,
    ),
    history: mergeMealHistory(
      localCanon.history,
      remoteCanon.history,
      baselineCanon?.history ?? [],
      localUpdatedMs,
      remoteUpdatedMs,
      tombstones.history,
    ),
    lastUpdatedDate: pickNewer(
      localCanon.lastUpdatedDate,
      remoteCanon.lastUpdatedDate,
      localUpdatedMs,
      remoteUpdatedMs,
    ),
    tombstones: mergedTombstones,
  };

  return canonicalMacroBundle(merged);
}

export function bundlesNeedCloudReconcile(merged: MacroDataBundle, remote: MacroDataBundle): boolean {
  return macroBundleFingerprint(merged) !== macroBundleFingerprint(remote);
}
