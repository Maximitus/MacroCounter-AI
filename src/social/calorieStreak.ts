import type {MacroTotals} from '../macroData/macroTypes.ts';

export type CalorieStreakSnapshot = {
  streakAboveDays: number;
  streakBelowDays: number;
};

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayTotals(
  dateKey: string,
  todayKey: string,
  todayMacros: MacroTotals,
  dailyLog: Record<string, MacroTotals>,
): MacroTotals | null {
  if (dateKey === todayKey) return todayMacros;
  const entry = dailyLog[dateKey];
  if (!entry) return null;
  return entry;
}

/**
 * Consecutive calendar days ending today. Each day is calories vs goal only.
 * Monthly cheat-day allowance in settings is not used. Missing log days break a streak.
 */
export function computeCalorieStreaks(
  dailyLog: Record<string, MacroTotals>,
  calorieGoal: number,
  todayKey: string,
  todayMacros: MacroTotals,
): CalorieStreakSnapshot {
  const goal = calorieGoal > 0 ? calorieGoal : 0;
  if (goal <= 0) {
    return {streakAboveDays: 0, streakBelowDays: 0};
  }

  function countStreak(direction: 'above' | 'below'): number {
    let count = 0;
    const d = new Date(`${todayKey}T12:00:00`);
    for (let i = 0; i < 400; i++) {
      const key = toLocalDateKey(d);
      const totals = dayTotals(key, todayKey, todayMacros, dailyLog);
      if (!totals) break;

      const {calories} = totals;
      if (calories === goal) break;
      if (direction === 'above' && calories > goal) {
        count++;
      } else if (direction === 'below' && calories < goal) {
        count++;
      } else {
        break;
      }
      d.setDate(d.getDate() - 1);
    }
    return count;
  }

  return {
    streakAboveDays: countStreak('above'),
    streakBelowDays: countStreak('below'),
  };
}
