import {useCallback, useEffect, useRef, type Dispatch, type SetStateAction} from 'react';
import {roundBodyWeightLb} from './profileBody.ts';
import type {UserProfile} from './socialTypes.ts';

function lastSyncedStorageKey(uid: string) {
  return `macrocounter_last_synced_profile_weight_lb_${uid}`;
}

function getLastSyncedProfileWeightLb(uid: string): number | null {
  try {
    const raw = localStorage.getItem(lastSyncedStorageKey(uid));
    if (!raw) return null;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? roundBodyWeightLb(n) : null;
  } catch {
    return null;
  }
}

export function markProfileWeightSynced(uid: string, lb: number) {
  try {
    localStorage.setItem(lastSyncedStorageKey(uid), String(roundBodyWeightLb(lb)));
  } catch {
    /* ignore quota */
  }
}

/**
 * When profile.bodyWeightLb changes (either app), append today's weight log entry.
 * Does not re-log on later days if the profile weight stayed the same.
 */
export function useApplyProfileBodyWeight(
  enabled: boolean,
  userId: string | undefined,
  profile: UserProfile | null,
  getTodayKey: () => string,
  setWeightLog: Dispatch<SetStateAction<Record<string, number>>>,
) {
  const pendingLocalPushRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;
    const lb = profile?.bodyWeightLb;
    if (lb == null || lb <= 0) return;
    const rounded = roundBodyWeightLb(lb);

    if (pendingLocalPushRef.current === rounded) {
      pendingLocalPushRef.current = null;
      markProfileWeightSynced(userId, rounded);
      return;
    }

    const lastSynced = getLastSyncedProfileWeightLb(userId);
    if (lastSynced == null) {
      markProfileWeightSynced(userId, rounded);
      return;
    }
    if (lastSynced === rounded) return;

    markProfileWeightSynced(userId, rounded);
    const todayKey = getTodayKey();
    setWeightLog((prev) => {
      if (prev[todayKey] === rounded) return prev;
      return {...prev, [todayKey]: rounded};
    });
  }, [enabled, userId, profile?.bodyWeightLb, getTodayKey, setWeightLog]);

  return useCallback((lb: number) => {
    pendingLocalPushRef.current = roundBodyWeightLb(lb);
  }, []);
}
