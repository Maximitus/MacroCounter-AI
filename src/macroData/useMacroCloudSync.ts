import {useCallback, useEffect, useRef, useState} from 'react';
import {doc, onSnapshot, serverTimestamp, setDoc} from 'firebase/firestore';
import type {User} from 'firebase/auth';
import toast from 'react-hot-toast';
import {getFirebaseDb, isFirebaseConfigured} from '../firebase.ts';
import {
  getLocalBundleUpdatedAtMs,
  loadLocalMacroBundleRaw,
  macroBundleFingerprint,
  markLocalBundleUpdatedAt,
  saveLocalMacroBundle,
} from './macroLocalPersistence.ts';
import type {FavoriteEntry, MacroDataBundle, MacroTotals, MealEntry} from './macroTypes.ts';
import type {MacroSyncConflictInfo} from './MacroSyncConflictModal.tsx';

const SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 900;
/** Remote snapshots older than our last committed write are ignored (multi-tab). */
const WRITE_SKEW_MS = 750;

function macroDocRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid, 'macros', 'data');
}

function bundleFromSnapshot(raw: Record<string, unknown> | undefined): MacroDataBundle | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1,
    macros: (raw.macros as MacroTotals) ?? {calories: 0, protein: 0, carbs: 0, fat: 0},
    goals: (raw.goals as MacroTotals) ?? {calories: 2000, protein: 150, carbs: 200, fat: 70},
    dailyLog:
      raw.dailyLog && typeof raw.dailyLog === 'object'
        ? (raw.dailyLog as Record<string, MacroTotals>)
        : {},
    weightGoal: typeof raw.weightGoal === 'number' ? raw.weightGoal : 0,
    weightLog:
      raw.weightLog && typeof raw.weightLog === 'object'
        ? (raw.weightLog as Record<string, number>)
        : {},
    favorites: Array.isArray(raw.favorites) ? (raw.favorites as FavoriteEntry[]) : [],
    history: Array.isArray(raw.history) ? (raw.history as MealEntry[]) : [],
    lastUpdatedDate: typeof raw.lastUpdatedDate === 'string' ? raw.lastUpdatedDate : '',
  };
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

function bundlesConflict(local: MacroDataBundle, remote: MacroDataBundle): boolean {
  if (!localHasData(local) || !cloudHasData(remote)) return false;
  return macroBundleFingerprint(local) !== macroBundleFingerprint(remote);
}

function applyBundleToState(
  bundle: MacroDataBundle,
  setters: {
    setMacros: (v: MacroTotals) => void;
    setGoals: (v: MacroTotals) => void;
    setDailyLog: (v: Record<string, MacroTotals>) => void;
    setWeightGoal: (v: number) => void;
    setWeightLog: (v: Record<string, number>) => void;
    setFavorites: (v: FavoriteEntry[]) => void;
    setHistory: (v: MealEntry[]) => void;
    setLastUpdatedDate: (v: string) => void;
  },
  flags: {applyingRemote: {current: boolean}; suppressDirty: {current: boolean}},
) {
  flags.suppressDirty.current = true;
  flags.applyingRemote.current = true;
  setters.setMacros(bundle.macros);
  setters.setGoals(bundle.goals);
  setters.setDailyLog(bundle.dailyLog);
  setters.setWeightGoal(bundle.weightGoal);
  setters.setWeightLog(bundle.weightLog);
  setters.setFavorites(bundle.favorites);
  setters.setHistory(bundle.history);
  if (bundle.lastUpdatedDate) setters.setLastUpdatedDate(bundle.lastUpdatedDate);
  flags.applyingRemote.current = false;
}

async function pushBundleToCloud(uid: string, bundle: MacroDataBundle) {
  await setDoc(macroDocRef(uid), {
    schemaVersion: SCHEMA_VERSION,
    macros: bundle.macros,
    goals: bundle.goals,
    dailyLog: bundle.dailyLog,
    weightGoal: bundle.weightGoal,
    weightLog: bundle.weightLog,
    favorites: bundle.favorites,
    history: bundle.history,
    lastUpdatedDate: bundle.lastUpdatedDate,
    updatedAt: serverTimestamp(),
  });
}

export type MacroCloudSyncProps = {
  user: User | null;
  authLoading: boolean;
  macros: MacroTotals;
  goals: MacroTotals;
  dailyLog: Record<string, MacroTotals>;
  weightGoal: number;
  weightLog: Record<string, number>;
  favorites: FavoriteEntry[];
  history: MealEntry[];
  lastUpdatedDate: string;
  setMacros: (v: MacroTotals) => void;
  setGoals: (v: MacroTotals) => void;
  setDailyLog: (v: Record<string, MacroTotals>) => void;
  setWeightGoal: (v: number) => void;
  setWeightLog: (v: Record<string, number>) => void;
  setFavorites: (v: FavoriteEntry[]) => void;
  setHistory: (v: MealEntry[]) => void;
  setLastUpdatedDate: (v: string) => void;
};

export function useMacroCloudSync({
  user,
  authLoading,
  macros,
  goals,
  dailyLog,
  weightGoal,
  weightLog,
  favorites,
  history,
  lastUpdatedDate,
  setMacros,
  setGoals,
  setDailyLog,
  setWeightGoal,
  setWeightLog,
  setFavorites,
  setHistory,
  setLastUpdatedDate,
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
    weightLog,
    favorites,
    history,
    lastUpdatedDate,
  });
  bundleRef.current = {
    macros,
    goals,
    dailyLog,
    weightGoal,
    weightLog,
    favorites,
    history,
    lastUpdatedDate,
  };

  const settersRef = useRef({
    setMacros,
    setGoals,
    setDailyLog,
    setWeightGoal,
    setWeightLog,
    setFavorites,
    setHistory,
    setLastUpdatedDate,
  });
  settersRef.current = {
    setMacros,
    setGoals,
    setDailyLog,
    setWeightGoal,
    setWeightLog,
    setFavorites,
    setHistory,
    setLastUpdatedDate,
  };

  const applyFlags = useRef({applyingRemote, suppressDirty});
  applyFlags.current = {applyingRemote, suppressDirty};

  const cloudEnabled = isFirebaseConfigured() && !!user && ready && !syncConflict;

  const resolveSyncConflict = useCallback(async (choice: 'local' | 'remote') => {
    const conflict = syncConflictRef.current;
    const uid = userRef.current?.uid;
    if (!conflict || !uid) return;

    setResolvingConflict(true);
    conflictResolvedRef.current = true;
    pendingLocalSaveRef.current = choice === 'local';

    try {
      if (choice === 'remote') {
        applyBundleToState(conflict.remote, settersRef.current, applyFlags.current);
        saveLocalMacroBundle(
          conflict.remote,
          conflict.remoteUpdatedMs > 0 ? conflict.remoteUpdatedMs : Date.now(),
        );
        baselineFingerprintRef.current = macroBundleFingerprint(conflict.remote);
        localDirty.current = false;
        toast.success('Using cloud data');
      } else {
        const localBundle: MacroDataBundle = {
          schemaVersion: SCHEMA_VERSION,
          ...conflict.local,
        };
        await pushBundleToCloud(uid, localBundle);
        lastCommittedWriteMsRef.current = Date.now();
        markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
        applyBundleToState(localBundle, settersRef.current, applyFlags.current);
        baselineFingerprintRef.current = macroBundleFingerprint(localBundle);
        localDirty.current = false;
        toast.success("Using this device's data");
      }
      setSyncConflict(null);
      setReady(true);
    } catch (e) {
      console.error(e);
      conflictResolvedRef.current = false;
      toast.error(
        choice === 'remote' ? 'Could not apply cloud data' : "Could not upload this device's data",
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
    const payload: MacroDataBundle = {
      schemaVersion: SCHEMA_VERSION,
      ...bundleRef.current,
    };
    void pushBundleToCloud(uid, payload)
      .then(() => {
        lastCommittedWriteMsRef.current = Date.now();
        markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
        baselineFingerprintRef.current = macroBundleFingerprint(payload);
        localDirty.current = false;
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
        const localBundle: MacroDataBundle = {
          schemaVersion: SCHEMA_VERSION,
          ...localFromStorage,
        };
        const localUpdatedMs = getLocalBundleUpdatedAtMs();

        if (!snap.exists()) {
          if (!migratedRef.current && localHasData(localBundle)) {
            migratedRef.current = true;
            try {
              await pushBundleToCloud(user.uid, localBundle);
              lastCommittedWriteMsRef.current = Date.now();
              markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
              baselineFingerprintRef.current = macroBundleFingerprint(localBundle);
              localDirty.current = false;
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
            await pushBundleToCloud(user.uid, localBundle);
            lastCommittedWriteMsRef.current = Date.now();
            markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
            baselineFingerprintRef.current = macroBundleFingerprint(localBundle);
            localDirty.current = false;
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
          const remoteBundle: MacroDataBundle = {
            schemaVersion: SCHEMA_VERSION,
            ...remote,
          };

          if (!conflictResolvedRef.current && bundlesConflict(localBundle, remoteBundle)) {
            if (!syncConflictRef.current) {
              setSyncConflict({
                local: localBundle,
                remote: remoteBundle,
                localUpdatedMs,
                remoteUpdatedMs: remoteMs,
              });
            }
            setSyncing(false);
            return;
          }

          if (!conflictResolvedRef.current) {
            applyBundleToState(remoteBundle, settersRef.current, applyFlags.current);
            saveLocalMacroBundle(remoteBundle, remoteMs > 0 ? remoteMs : Date.now());
            baselineFingerprintRef.current = macroBundleFingerprint(remoteBundle);
            localDirty.current = false;
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
              applyBundleToState(remoteBundle, settersRef.current, applyFlags.current);
              saveLocalMacroBundle(remoteBundle, remoteMs > 0 ? remoteMs : Date.now());
              baselineFingerprintRef.current = remoteFp;
              localDirty.current = false;
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

    const fp = macroBundleFingerprint({
      schemaVersion: SCHEMA_VERSION,
      ...bundleRef.current,
    });
    if (baselineFingerprintRef.current != null && fp === baselineFingerprintRef.current) {
      return;
    }

    localDirty.current = true;
    markLocalBundleUpdatedAt();

    const generation = ++localSaveGenerationRef.current;
    pendingLocalSaveRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const payload: MacroDataBundle = {
        schemaVersion: SCHEMA_VERSION,
        ...bundleRef.current,
      };
      void pushBundleToCloud(user!.uid, payload)
        .then(() => {
          lastCommittedWriteMsRef.current = Date.now();
          markLocalBundleUpdatedAt(lastCommittedWriteMsRef.current);
          baselineFingerprintRef.current = macroBundleFingerprint(payload);
          localDirty.current = false;
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
    weightLog,
    favorites,
    history,
    lastUpdatedDate,
  ]);

  return {cloudEnabled, syncing, ready, syncConflict, resolvingConflict, resolveSyncConflict};
}
