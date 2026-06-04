import {useEffect, useRef} from 'react';
import type {User} from 'firebase/auth';
import {isFirebaseConfigured} from '../firebase.ts';
import type {MacroTotals} from '../macroData/macroTypes.ts';
import {computeCalorieStreaks} from './calorieStreak.ts';
import {setMacroSocial} from './socialRepository.ts';

const DEBOUNCE_MS = 1200;

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function usePublishCalorieStreak(
  user: User | null,
  dailyLog: Record<string, MacroTotals>,
  calorieGoal: number,
  todayMacros: MacroTotals,
): void {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured() || !user || user.isAnonymous) return;

    const todayKey = getTodayKey();
    const {streakAboveDays, streakBelowDays} = computeCalorieStreaks(
      dailyLog,
      calorieGoal,
      todayKey,
      todayMacros,
    );

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void setMacroSocial(user.uid, streakAboveDays, streakBelowDays).catch((e) => {
        console.error('Could not publish calorie streak', e);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user?.uid, user?.isAnonymous, dailyLog, calorieGoal, todayMacros]);
}
