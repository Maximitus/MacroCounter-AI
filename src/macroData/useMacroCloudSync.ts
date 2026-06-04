import {useEffect, useRef, useState} from 'react';
import {doc, onSnapshot, serverTimestamp, setDoc} from 'firebase/firestore';
import type {User} from 'firebase/auth';
import toast from 'react-hot-toast';
import {getFirebaseDb, isFirebaseConfigured} from '../firebase.ts';
import type {FavoriteEntry, MacroDataBundle, MacroTotals, MealEntry} from './macroTypes.ts';

const SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 900;

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
  const applyingRemote = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const migratedRef = useRef(false);
  const pendingLocalSaveRef = useRef(false);
  const localSaveGenerationRef = useRef(0);
  const lastCommittedWriteMsRef = useRef(0);

  const cloudEnabled = isFirebaseConfigured() && !!user && ready;

  useEffect(() => {
    if (authLoading || !isFirebaseConfigured()) {
      setReady(false);
      setSyncing(false);
      return;
    }
    if (!user) {
      setReady(false);
      setSyncing(false);
      migratedRef.current = false;
      lastCommittedWriteMsRef.current = 0;
      return;
    }

    setSyncing(true);
    setReady(false);
    const ref = macroDocRef(user.uid);

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        const localBundle: MacroDataBundle = {
          schemaVersion: SCHEMA_VERSION,
          macros,
          goals,
          dailyLog,
          weightGoal,
          weightLog,
          favorites,
          history,
          lastUpdatedDate,
        };

        if (!snap.exists()) {
          if (!migratedRef.current && localHasData(localBundle)) {
            migratedRef.current = true;
            try {
              await setDoc(ref, {
                ...localBundle,
                schemaVersion: SCHEMA_VERSION,
                updatedAt: serverTimestamp(),
              });
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
            await setDoc(ref, {
              ...localBundle,
              schemaVersion: SCHEMA_VERSION,
              updatedAt: serverTimestamp(),
            });
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
          remoteMs < lastCommittedWriteMsRef.current - 750;

        if (
          cloudHasData(remote) &&
          !pendingLocalSaveRef.current &&
          !snap.metadata.hasPendingWrites &&
          !staleRemote
        ) {
          applyingRemote.current = true;
          setMacros(remote.macros);
          setGoals(remote.goals);
          setDailyLog(remote.dailyLog);
          setWeightGoal(remote.weightGoal);
          setWeightLog(remote.weightLog);
          setFavorites(remote.favorites);
          setHistory(remote.history);
          if (remote.lastUpdatedDate) setLastUpdatedDate(remote.lastUpdatedDate);
          applyingRemote.current = false;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot drives migration once per sign-in
  }, [user?.uid, authLoading]);

  useEffect(() => {
    if (!cloudEnabled || applyingRemote.current) return;

    const generation = ++localSaveGenerationRef.current;
    pendingLocalSaveRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const payload: MacroDataBundle = {
        schemaVersion: SCHEMA_VERSION,
        macros,
        goals,
        dailyLog,
        weightGoal,
        weightLog,
        favorites,
        history,
        lastUpdatedDate,
      };
      void setDoc(macroDocRef(user!.uid), {
        ...payload,
        updatedAt: serverTimestamp(),
      })
        .then(() => {
          lastCommittedWriteMsRef.current = Date.now();
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

  return {cloudEnabled, syncing, ready};
}
