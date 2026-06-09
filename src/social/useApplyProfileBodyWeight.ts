import {useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction} from 'react';
import {roundBodyWeightLb} from './profileBody.ts';
import type {UserProfile} from './socialTypes.ts';

/** Applies `profile.bodyWeightLb` from Firestore into today's weight log entry. */
export function useApplyProfileBodyWeight(
  enabled: boolean,
  profile: UserProfile | null,
  getTodayKey: () => string,
  setWeightLog: Dispatch<SetStateAction<Record<string, number>>>,
  lastLocalPushRef: MutableRefObject<number | null>,
): void {
  const lastAppliedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const lb = profile?.bodyWeightLb;
    if (lb == null || lb <= 0) return;
    const rounded = roundBodyWeightLb(lb);
    if (lastLocalPushRef.current === rounded) {
      lastLocalPushRef.current = null;
      return;
    }
    if (lastAppliedRef.current === rounded) return;
    lastAppliedRef.current = rounded;
    const todayKey = getTodayKey();
    setWeightLog((prev) => {
      if (prev[todayKey] === rounded) return prev;
      return {...prev, [todayKey]: rounded};
    });
  }, [enabled, profile?.bodyWeightLb, getTodayKey, setWeightLog, lastLocalPushRef]);
}
