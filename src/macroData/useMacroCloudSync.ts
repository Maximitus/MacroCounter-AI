import {useCallback, useEffect, useRef, useState} from 'react';
import {doc, getDoc, onSnapshot, serverTimestamp, setDoc} from 'firebase/firestore';
import type {User} from 'firebase/auth';
import toast from 'react-hot-toast';
import {getFirebaseDb, isFirebaseConfigured} from '../firebase.ts';
import {bundlesNeedCloudReconcile, mergeMacroBundles} from './mergeMacroBundles.ts';
import {
  canonicalMacroBundle,
  getLastSyncedBundle,
  getLocalBundleUpdatedAtMs,
  loadLocalMacroBundleRaw,
  macroBundleFingerprint,
  markLocalBundleUpdatedAt,
  normalizeWeightGoalDate,
  saveLocalMacroBundle,
  setLastSyncedBundle,
} from './macroLocalPersistence.ts';
import {
  computeDeletionTombstones,
  mergeTombstones,
  tombstonesFromFirestore,
} from './macroTombstones.ts';
import {filterTodayMealHistory} from './mealHistory.ts';
import {emptyStreakBundle} from '../loggingStreak.ts';
import {normalizeCalorieGoalMode} from '../macroProgress.ts';
import type {
  CalorieGoalMode,
  FavoriteEntry,
  MacroDataBundle,
  MacroTotals,
  MealEntry,
  StreakBundle,
} from './macroTypes.ts';
import type {MacroSyncConflictInfo} from './MacroSyncConflictModal.tsx';

const SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 900;
/** Remote snapshots older than our last committed write are ignored (multi-tab). */
const WRITE_SKEW_MS = 750;

function macroDocRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid, 'macros', 'data');
}

function emptyMacroBundle(): MacroDataBundle {
  return {
    schemaVersion: SCHEMA_VERSION,
    macros: {calories: 0, protein: 0, carbs: 0, fat: 0},
    goals: {calories: 2000, protein: 150, carbs: 200, fat: 70},
    dailyLog: {},
    weightGoal: 0,
    weightGoalDate: '',
    calorieGoalMode: 'maintain',
    weightLog: {},
    favorites: [],
    history: [],
    lastUpdatedDate: '',
    streak: emptyStreakBundle(),
  };
}

function bundleFromSnapshot(raw: Record<string, unknown> | undefined): MacroDataBundle | null {
  if (!raw || typeof raw !== 'object') return null;
  return canonicalMacroBundle({
    schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1,
    macros: (raw.macros as MacroTotals) ?? {calories: 0, protein: 0, carbs: 0, fat: 0},
    goals: (raw.goals as MacroTotals) ?? {calories: 2000, protein: 150, carbs: 200, fat: 70},
    dailyLog:
      raw.dailyLog && typeof raw.dailyLog === 'object'
        ? (raw.dailyLog as Record<string, MacroTotals>)
        : {},
    weightGoal: typeof raw.weightGoal === 'number' ? raw.weightGoal : 0,
    weightGoalDate: normalizeWeightGoalDate(raw.weightGoalDate),
    calorieGoalMode: normalizeCalorieGoalMode(raw.calorieGoalMode),
    weightLog:
      raw.weightLog && typeof raw.weightLog === 'object'
        ? (raw.weightLog as Record<string, number>)
        : {},
    favorites: Array.isArray(raw.favorites) ? (raw.favorites as FavoriteEntry[]) : [],
    history: Array.isArray(raw.history) ? (raw.history as MealEntry[]) : [],
    lastUpdatedDate: typeof raw.lastUpdatedDate === 'string' ? raw.lastUpdatedDate : '',
    streak:
      raw.streak && typeof raw.streak === 'object'
        ? (raw.streak as StreakBundle)
        : emptyStreakBundle(),
    tombstones: tombstonesFromFirestore(raw.tombstones),
  });
}

function cloudHasData(bundle: MacroDataBundle): boolean {
  return (
    bundle.history.length > 0 ||
    Object.keys(bundle.dailyLog).length > 0 ||
    bundle.favorites.length > 0 ||
    bundle.macros.calories > 0 ||
    bundle.weightGoal > 0 ||
    Object.keys(bundle.weightLog).length > 0
  );
}

function localHasData(bundle: MacroDataBundle): boolean {
  return cloudHasData(bundle);
}

function remoteUpdatedMs(raw: Record<string, unknown> | undefined): number {
  const updatedAt = raw?.updatedAt;
  if (
    updatedAt &&
    typeof updatedAt === 'object' &&
    'toMillis' in updatedAt &&
    typeof (updatedAt as {toMillis: () => number}).toMillis === 'function'
  ) {
    return (updatedAt as {toMillis: () => number}).toMillis();
  }
  return 0;
}

function remoteToBundle(remote: MacroDataBundle): MacroDataBundle {
  return canonicalMacroBundle({
    schemaVersion: SCHEMA_VERSION,
    ...remote,
  });
}

function applyStreakBundleToState(
  streak: StreakBundle,
  setters: {
    setMealCountByDay: (v: Record<string, number>) => void;
    setStreakCheatDays: (v: Record<string, true>) => void;
    setStreakFastingDays: (v: Record<string, true>) => void;
    setStreakVacationDays: (v: Record<string, true>) => void;
    setStreakVacationMode: (v: boolean) => void;
    setCheatDaysPerWeek: (v: number) => void;
  },
) {
  const s = streak ?? emptyStreakBundle();
  setters.setMealCountByDay({...s.mealCountByDay});
  setters.setStreakCheatDays({...s.cheatDays});
  setters.setStreakFastingDays({...s.fastingDays});
  setters.setStreakVacationDays({...s.vacationDays});
  setters.setStreakVacationMode(s.vacationMode);
  setters.setCheatDaysPerWeek(s.cheatDaysPerWeek);
}

function applyBundleToState(
  bundle: MacroDataBundle,
  setters: {
    setMacros: (v: MacroTotals) => void;
    setGoals: (v: MacroTotals) => void;
    setDailyLog: (v: Record<string, MacroTotals>) => void;
    setWeightGoal: (v: number) => void;
    setWeightGoalDate: (v: string) => void;
    setCalorieGoalMode: (v: CalorieGoalMode) => void;
    setWeightLog: (v: Record<string, number>) => void;
    setFavorites: (v: FavoriteEntry[]) => void;
    setHistory: (v: MealEntry[]) => void;
    setLastUpdatedDate: (v: string) => void;
    setMealCountByDay: (v: Record<string, number>) => void;
    setStreakCheatDays: (v: Record<string, true>) => void;
    setStreakFastingDays: (v: Record<string, true>) => void;
    setStreakVacationDays: (v: Record<string, true>) => void;
    setStreakVacationMode: (v: boolean) => void;
    setCheatDaysPerWeek: (v: number) => void;
  },
  flags: {applyingRemote: {current: boolean}; suppressDirty: {current: boolean}},
) {
  flags.suppressDirty.current = true;
  flags.applyingRemote.current = true;
  setters.setMacros(bundle.macros);
  setters.setGoals(bundle.goals);
  setters.setDailyLog(bundle.dailyLog);
  setters.setWeightGoal(bundle.weightGoal);
  setters.setWeightGoalDate(bundle.weightGoalDate);
  setters.setCalorieGoalMode(bundle.calorieGoalMode);
  setters.setWeightLog(bundle.weightLog);
  setters.setFavorites(bundle.favorites);
  setters.setHistory(filterTodayMealHistory(bundle.history));
  if (bundle.lastUpdatedDate) setters.setLastUpdatedDate(bundle.lastUpdatedDate);
  applyStreakBundleToState(bundle.streak ?? emptyStreakBundle(), setters);
  flags.applyingRemote.current = false;
}

async function writeBundleToCloud(uid: string, bundle: MacroDataBundle) {
  const canonical = canonicalMacroBundle(bundle);
  const payload: Record<string, unknown> = {
    schemaVersion: SCHEMA_VERSION,
    macros: canonical.macros,
    goals: canonical.goals,
    dailyLog: canonical.dailyLog,
    weightGoal: canonical.weightGoal,
    weightGoalDate: canonical.weightGoalDate,
    calorieGoalMode: canonical.calorieGoalMode,
    weightLog: canonical.weightLog,
    favorites: canonical.favorites,
    history: canonical.history,
    lastUpdatedDate: canonical.lastUpdatedDate,
    streak: canonical.streak ?? emptyStreakBundle(),
    updatedAt: serverTimestamp(),
  };
  if (canonical.tombstones) payload.tombstones = canonical.tombstones;
  await setDoc(macroDocRef(uid), payload);
}

async function reconcileAndPushToCloud(
  uid: string,
  localBundle: MacroDataBundle,
  localUpdatedMs: number,
): Promise<MacroDataBundle> {
  const ref = macroDocRef(uid);
  const snap = await getDoc(ref);
  const baseline = getLastSyncedBundle(uid);
  const remoteRaw = snap.exists() ? snap.data() : undefined;
  const remoteBundle = remoteRaw
    ? remoteToBundle(bundleFromSnapshot(remoteRaw) ?? emptyMacroBundle())
    : emptyMacroBundle();
  const remoteMs = remoteUpdatedMs(remoteRaw);
  const deletionTombstones = computeDeletionTombstones(baseline, localBundle);
  const tombstones = mergeTombstones(
    deletionTombstones,
    localBundle.tombstones,
    remoteBundle.tombstones,
    baseline?.tombstones,
  );
  const localPrepared = canonicalMacroBundle({...localBundle, tombstones});
  const merged = mergeMacroBundles({
    local: localPrepared,
    remote: remoteBundle,
    baseline,
    localUpdatedMs: localUpdatedMs > 0 ? localUpdatedMs : Date.now(),
    remoteUpdatedMs: remoteMs,
  });
  await writeBundleToCloud(uid, merged);
  return merged;
}

export type MacroCloudSyncProps = {
  user: User | null;
  authLoading: boolean;
  macros: MacroTotals;
  goals: MacroTotals;
  dailyLog: Record<string, MacroTotals>;
  weightGoal: number;
  weightGoalDate: string;
  calorieGoalMode: CalorieGoalMode;
  weightLog: Record<string, number>;
  favorites: FavoriteEntry[];
  history: MealEntry[];
  lastUpdatedDate: string;
  mealCountByDay: Record<string, number>;
  streakCheatDays: Record<string, true>;
  streakFastingDays: Record<string, true>;
  streakVacationDays: Record<string, true>;
  streakVacationMode: boolean;
  cheatDaysPerWeek: number;
  setMacros: (v: MacroTotals) => void;
  setGoals: (v: MacroTotals) => void;
  setDailyLog: (v: Record<string, MacroTotals>) => void;
  setWeightGoal: (v: number) => void;
  setWeightGoalDate: (v: string) => void;
  setCalorieGoalMode: (v: CalorieGoalMode) => void;
  setWeightLog: (v: Record<string, number>) => void;
  setFavorites: (v: FavoriteEntry[]) => void;
  setHistory: (v: MealEntry[]) => void;
  setLastUpdatedDate: (v: string) => void;
  setMealCountByDay: (v: Record<string, number>) => void;
  setStreakCheatDays: (v: Record<string, true>) => void;
  setStreakFastingDays: (v: Record<string, true>) => void;
  setStreakVacationDays: (v: Record<string, true>) => void;
  setStreakVacationMode: (v: boolean) => void;
  setCheatDaysPerWeek: (v: number) => void;
};

export function useMacroCloudSync({
  user,
  authLoading,
  macros,
  goals,
  dailyLog,
  weightGoal,
  weightGoalDate,
  calorieGoalMode,
  weightLog,
  favorites,
  history,
  lastUpdatedDate,
  mealCountByDay,
  streakCheatDays,
  streakFastingDays,
  streakVacationDays,
  streakVacationMode,
  cheatDaysPerWeek,
  setMacros,
  setGoals,
  setDailyLog,
  setWeightGoal,
  setWeightGoalDate,
  setCalorieGoalMode,
  setWeightLog,
  setFavorites,
  setHistory,
  setLastUpdatedDate,
  setMealCountByDay,
  setStreakCheatDays,
  setStreakFastingDays,
  setStreakVacationDays,
  setStreakVacationMode,
  setCheatDaysPerWeek,
}: MacroCloudSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [ready, setReady] = useState(false);
  const [syncConflict, setSyncConflict] = useState<MacroSyncConflictInfo | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const applyingRemote = useRef(false);
  const suppressDirty = useRef(false);
  const localDirty = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const migratedRef = useRef(false);
  const conflictResolvedRef = useRef(false);
  const syncConflictRef = useRef<MacroSyncConflictInfo | null>(null);
  const pendingLocalSaveRef = useRef(false);
  const localSaveGenerationRef = useRef(0);
  const lastCommittedWriteMsRef = useRef(0);
  const baselineFingerprintRef = useRef<string | null>(null);
  const userRef = useRef(user);
  userRef.current = user;
  syncConflictRef.current = syncConflict;

  const bundleRef = useRef({
    macros,
    goals,
    dailyLog,
    weightGoal,
    weightGoalDate,
    calorieGoalMode,
    weightLog,
    favorites,
    history,
    lastUpdatedDate,
    streak: {
      mealCountByDay,
      cheatDays: streakCheatDays,
      fastingDays: streakFastingDays,
      vacationDays: streakVacationDays,
      vacationMode: streakVacationMode,
      cheatDaysPerWeek,
    },
  });
  bundleRef.current = {
    macros,
    goals,
    dailyLog,
    weightGoal,
    weightGoalDate,
    calorieGoalMode,
    weightLog,
    favorites,
    history,
    lastUpdatedDate,
    streak: {
      mealCountByDay,
      cheatDays: streakCheatDays,
      fastingDays: streakFastingDays,
      vacationDays: streakVacationDays,
      vacationMode: streakVacationMode,
      cheatDaysPerWeek,
    },
  };

  const settersRef = useRef({
    setMacros,
    setGoals,
    setDailyLog,
    setWeightGoal,
    setWeightGoalDate,
    setCalorieGoalMode,
    setWeightLog,
    setFavorites,
    setHistory,
    setLastUpdatedDate,
    setMealCountByDay,
    setStreakCheatDays,
    setStreakFastingDays,
    setStreakVacationDays,
    setStreakVacationMode,
    setCheatDaysPerWeek,
  });
  settersRef.current = {
    setMacros,
    setGoals,
    setDailyLog,
    setWeightGoal,
    setWeightGoalDate,
    setCalorieGoalMode,
    setWeightLog,
    setFavorites,
    setHistory,
    setLastUpdatedDate,
    setMealCountByDay,
    setStreakCheatDays,
    setStreakFastingDays,
    setStreakVacationDays,
    setStreakVacationMode,
    setCheatDaysPerWeek,
  };

  const applyFlags = useRef({applyingRemote, suppressDirty});
  applyFlags.current = {applyingRemote, suppressDirty};

  const cloudEnabled = isFirebaseConfigured() && !!user && ready && !syncConflict;

  const recordSyncedFingerprint = (_uid: string, bundle: MacroDataBundle) => {
    baselineFingerprintRef.current = macroBundleFingerprint(bundle);
  };

  const recordMergedBundle = (uid: string, bundle: MacroDataBundle) => {
    recordSyncedFingerprint(uid, bundle);
    setLastSyncedBundle(uid, bundle);
  };

  const applyReconciledPush = (
    uid: string,
    merged: MacroDataBundle,
    localBundle: MacroDataBundle,
    atMs: number,
  ) => {
    const mergedFp = macroBundleFingerprint(merged);
    const localFp = macroBundleFingerprint(localBundle);
    if (mergedFp !== localFp) {
      applyBundleToState(merged, settersRef.current, applyFlags.current);
    }
    saveLocalMacroBundle(merged, atMs);
    recordMergedBundle(uid, merged);
    localDirty.current = false;
  };

  const applyMergedBundle = async (
    uid: string,
    merged: MacroDataBundle,
    remoteBundle: MacroDataBundle,
    remoteMs: number,
    localUpdatedMs: number,
  ) => {
    applyBundleToState(merged, settersRef.current, applyFlags.current);
    const mergedAt = Math.max(localUpdatedMs, remoteMs) || Date.now();
    saveLocalMacroBundle(merged, mergedAt);
    recordMergedBundle(uid, merged);

    if (bundlesNeedCloudReconcile(merged, remoteBundle) && !pendingLocalSaveRef.current) {
      try {
        await writeBundleToCloud(uid, merged);
        lastCommittedWriteMsRef.current = Date.now();
        markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
      } catch (e) {
        console.error(e);
        toast.error('Could not reconcile merged macro data');
      }
    }

    localDirty.current = false;
  };

  const resolveSyncConflict = useCallback(async (choice: 'local' | 'remote' | 'merge') => {
    const conflict = syncConflictRef.current;
    const uid = userRef.current?.uid;
    if (!conflict || !uid) return;

    setResolvingConflict(true);
    conflictResolvedRef.current = true;
    pendingLocalSaveRef.current = choice === 'local' || choice === 'merge';

    try {
      if (choice === 'merge') {
        const merged = mergeMacroBundles({
          local: conflict.local,
          remote: conflict.remote,
          baseline: getLastSyncedBundle(uid),
          localUpdatedMs: conflict.localUpdatedMs,
          remoteUpdatedMs: conflict.remoteUpdatedMs,
        });
        await applyMergedBundle(
          uid,
          merged,
          remoteToBundle(conflict.remote),
          conflict.remoteUpdatedMs,
          conflict.localUpdatedMs,
        );
        toast.success('Merged macro data from both copies');
      } else if (choice === 'remote') {
        const remoteBundle = remoteToBundle(conflict.remote);
        applyBundleToState(remoteBundle, settersRef.current, applyFlags.current);
        saveLocalMacroBundle(
          remoteBundle,
          conflict.remoteUpdatedMs > 0 ? conflict.remoteUpdatedMs : Date.now(),
        );
        recordMergedBundle(uid, remoteBundle);
        localDirty.current = false;
        toast.success('Using cloud data');
      } else {
        const localBundle: MacroDataBundle = {
          schemaVersion: SCHEMA_VERSION,
          ...conflict.local,
        };
        const merged = await reconcileAndPushToCloud(
          uid,
          localBundle,
          conflict.localUpdatedMs > 0 ? conflict.localUpdatedMs : Date.now(),
        );
        lastCommittedWriteMsRef.current = Date.now();
        markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
        applyReconciledPush(uid, merged, localBundle, lastCommittedWriteMsRef.current);
        toast.success("Using this device's data");
      }
      setSyncConflict(null);
      setReady(true);
    } catch (e) {
      console.error(e);
      conflictResolvedRef.current = false;
      toast.error(
        choice === 'remote'
          ? 'Could not apply cloud data'
          : choice === 'merge'
            ? 'Could not merge macro data'
            : "Could not upload this device's data",
      );
    } finally {
      pendingLocalSaveRef.current = false;
      setResolvingConflict(false);
      setSyncing(false);
    }
  }, []);

  const flushPendingCloudSave = () => {
    const uid = userRef.current?.uid;
    if (!uid || !debounceRef.current || !localDirty.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = null;
    const generation = ++localSaveGenerationRef.current;
    pendingLocalSaveRef.current = true;
    const payload: MacroDataBundle = canonicalMacroBundle({
      schemaVersion: SCHEMA_VERSION,
      ...bundleRef.current,
    });
    void reconcileAndPushToCloud(uid, payload, getLocalBundleUpdatedAtMs())
      .then((merged) => {
        lastCommittedWriteMsRef.current = Date.now();
        markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
        applyReconciledPush(uid, merged, payload, lastCommittedWriteMsRef.current);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        if (generation === localSaveGenerationRef.current) {
          pendingLocalSaveRef.current = false;
        }
      });
  };

  useEffect(() => {
    const onPageHide = () => flushPendingCloudSave();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPendingCloudSave();
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (authLoading || !isFirebaseConfigured()) {
      setReady(false);
      setSyncing(false);
      return;
    }
    if (!user) {
      setReady(false);
      setSyncing(false);
      setSyncConflict(null);
      setResolvingConflict(false);
      migratedRef.current = false;
      conflictResolvedRef.current = false;
      lastCommittedWriteMsRef.current = 0;
      localDirty.current = false;
      baselineFingerprintRef.current = null;
      return;
    }

    setSyncing(true);
    setReady(false);
    setSyncConflict(null);
    conflictResolvedRef.current = false;
    localDirty.current = false;
    const ref = macroDocRef(user.uid);

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        const localFromStorage = loadLocalMacroBundleRaw();
        const live = bundleRef.current;
        const localBundle: MacroDataBundle = canonicalMacroBundle({
          schemaVersion: SCHEMA_VERSION,
          macros: live.macros,
          goals: live.goals,
          dailyLog: live.dailyLog,
          weightGoal: live.weightGoal,
          weightGoalDate: live.weightGoalDate,
          calorieGoalMode: live.calorieGoalMode,
          weightLog: live.weightLog,
          favorites: live.favorites,
          history: live.history,
          lastUpdatedDate: live.lastUpdatedDate,
          streak: live.streak,
          tombstones: localFromStorage.tombstones,
        });
        const localUpdatedMs = getLocalBundleUpdatedAtMs();

        if (!snap.exists()) {
          if (!migratedRef.current && localHasData(localBundle)) {
            migratedRef.current = true;
            try {
              const merged = await reconcileAndPushToCloud(
                user.uid,
                localBundle,
                localUpdatedMs > 0 ? localUpdatedMs : Date.now(),
              );
              lastCommittedWriteMsRef.current = Date.now();
              markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
              applyReconciledPush(user.uid, merged, localBundle, lastCommittedWriteMsRef.current);
              toast.success('Macro data uploaded to your account');
            } catch (e) {
              console.error(e);
              toast.error('Could not upload macro data');
              setSyncing(false);
            }
            return;
          }
          applyingRemote.current = true;
          setReady(true);
          setSyncing(false);
          applyingRemote.current = false;
          return;
        }

        const remote = bundleFromSnapshot(snap.data());
        if (!remote) {
          setReady(true);
          setSyncing(false);
          return;
        }

        if (!cloudHasData(remote) && !migratedRef.current && localHasData(localBundle)) {
          migratedRef.current = true;
          try {
            const merged = await reconcileAndPushToCloud(
              user.uid,
              localBundle,
              localUpdatedMs > 0 ? localUpdatedMs : Date.now(),
            );
            lastCommittedWriteMsRef.current = Date.now();
            markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
            applyReconciledPush(user.uid, merged, localBundle, lastCommittedWriteMsRef.current);
            toast.success('Macro data uploaded to your account');
          } catch (e) {
            console.error(e);
            toast.error('Could not upload macro data');
          }
          return;
        }

        const remoteMs = remoteUpdatedMs(snap.data());
        const staleRemote =
          remoteMs > 0 &&
          lastCommittedWriteMsRef.current > 0 &&
          remoteMs < lastCommittedWriteMsRef.current - WRITE_SKEW_MS;

        if (
          cloudHasData(remote) &&
          !pendingLocalSaveRef.current &&
          !snap.metadata.hasPendingWrites &&
          !staleRemote
        ) {
          const remoteBundle = remoteToBundle(remote);
          const merged = mergeMacroBundles({
            local: localBundle,
            remote: remoteBundle,
            baseline: getLastSyncedBundle(user.uid),
            localUpdatedMs,
            remoteUpdatedMs: remoteMs,
          });

          if (!conflictResolvedRef.current) {
            try {
              await applyMergedBundle(user.uid, merged, remoteBundle, remoteMs, localUpdatedMs);
            } catch (e) {
              console.error(e);
            }
          } else {
            const remoteFp = macroBundleFingerprint(remoteBundle);
            const localFp = macroBundleFingerprint(localBundle);
            const baseline = baselineFingerprintRef.current;
            if (
              baseline != null &&
              localFp === baseline &&
              remoteFp !== baseline &&
              remoteMs > lastCommittedWriteMsRef.current - WRITE_SKEW_MS
            ) {
              try {
                await applyMergedBundle(user.uid, merged, remoteBundle, remoteMs, localUpdatedMs);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }

        setReady(true);
        setSyncing(false);
      },
      (err) => {
        console.error(err);
        toast.error('Cloud sync error');
        setSyncing(false);
      },
    );

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user?.uid, authLoading]);

  useEffect(() => {
    if (!cloudEnabled || applyingRemote.current) return;
    if (suppressDirty.current) {
      suppressDirty.current = false;
      return;
    }

    const fp = macroBundleFingerprint(
      canonicalMacroBundle({
        schemaVersion: SCHEMA_VERSION,
        ...bundleRef.current,
      }),
    );
    if (baselineFingerprintRef.current != null && fp === baselineFingerprintRef.current) {
      return;
    }

    localDirty.current = true;
    markLocalBundleUpdatedAt();

    const generation = ++localSaveGenerationRef.current;
    pendingLocalSaveRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const payload: MacroDataBundle = canonicalMacroBundle({
        schemaVersion: SCHEMA_VERSION,
        ...bundleRef.current,
      });
      void reconcileAndPushToCloud(user!.uid, payload, getLocalBundleUpdatedAtMs())
        .then((merged) => {
          lastCommittedWriteMsRef.current = Date.now();
          markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
          applyReconciledPush(user!.uid, merged, payload, lastCommittedWriteMsRef.current);
        })
        .catch((e) => {
          console.error(e);
          toast.error('Could not save to cloud');
        })
        .finally(() => {
          if (generation === localSaveGenerationRef.current) {
            pendingLocalSaveRef.current = false;
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      localSaveGenerationRef.current += 1;
    };
  }, [
    cloudEnabled,
    user,
    macros,
    goals,
    dailyLog,
    weightGoal,
    weightGoalDate,
    calorieGoalMode,
    weightLog,
    favorites,
    history,
    lastUpdatedDate,
    mealCountByDay,
    streakCheatDays,
    streakFastingDays,
    streakVacationDays,
    streakVacationMode,
    cheatDaysPerWeek,
  ]);

  return {cloudEnabled, syncing, ready, syncConflict, resolvingConflict, resolveSyncConflict};
}
