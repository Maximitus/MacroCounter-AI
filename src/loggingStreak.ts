import type {CalorieGoalMode} from './macroData/macroTypes.ts';
import type {MacroTotals, StreakBundle} from './macroData/macroTypes.ts';
import {macroGoalMet} from './macroProgress.ts';

export type CalorieStreakSnapshot = {
  streakDays: number;
  includesToday: boolean;
  todayAtRisk: boolean;
  todayCalories: number;
  calorieGoal: number;
  cheatDaysUsedThisWeek: number;
  cheatDaysPerWeek: number;
  cheatCreditsRemaining: number;
  cheatDayToday: boolean;
  canSpendCheatCreditToday: boolean;
};

export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Sunday-start week id for grouping cheat-day allowance. */
export function weekIdForDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  const day = d.getDay();
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - day);
  return toLocalDateKey(weekStart);
}

export function cheatDaysUsedInWeek(
  cheatDays: Record<string, true>,
  dateKey: string,
): number {
  const weekId = weekIdForDateKey(dateKey);
  return Object.keys(cheatDays).filter((k) => weekIdForDateKey(k) === weekId).length;
}

function dayCalories(args: {
  dateKey: string;
  todayKey: string;
  todayMacros: MacroTotals;
  dailyLog: Record<string, MacroTotals>;
}): number | null {
  if (args.dateKey === args.todayKey) return args.todayMacros.calories;
  const entry = args.dailyLog[args.dateKey];
  if (!entry) return null;
  return entry.calories;
}

function dayMetCalorieGoal(args: {
  dateKey: string;
  todayKey: string;
  todayMacros: MacroTotals;
  dailyLog: Record<string, MacroTotals>;
  calorieGoal: number;
  calorieGoalMode: CalorieGoalMode;
}): boolean {
  const calories = dayCalories(args);
  if (calories === null) return false;
  if (args.dateKey === args.todayKey && calories <= 0) return false;
  return macroGoalMet('calories', calories, args.calorieGoal, args.calorieGoalMode);
}

/** Consecutive days meeting the calorie goal (fasting, vacation, cheat days do not affect this). */
export function computeCalorieStreak(args: {
  todayKey: string;
  todayMacros: MacroTotals;
  dailyLog: Record<string, MacroTotals>;
  calorieGoal: number;
  calorieGoalMode: CalorieGoalMode;
  cheatDays: Record<string, true>;
  cheatDaysPerWeek: number;
}): CalorieStreakSnapshot {
  const {
    todayKey,
    todayMacros,
    dailyLog,
    calorieGoal,
    calorieGoalMode,
    cheatDays,
    cheatDaysPerWeek,
  } = args;

  const perDay = {
    todayKey,
    todayMacros,
    dailyLog,
    calorieGoal,
    calorieGoalMode,
  };

  const todayMet = calorieGoal > 0 && dayMetCalorieGoal({...perDay, dateKey: todayKey});
  const cheatDaysUsedThisWeek = cheatDaysUsedInWeek(cheatDays, todayKey);
  const cheatDayToday = cheatDays[todayKey] === true;
  const cheatCreditsRemaining = Math.max(0, cheatDaysPerWeek - cheatDaysUsedThisWeek);
  const canSpendCheatCreditToday =
    cheatDaysPerWeek > 0 && !cheatDayToday && cheatCreditsRemaining > 0;

  let streakDays = 0;
  const d = new Date(`${todayKey}T12:00:00`);

  if (todayMet) {
    for (let i = 0; i < 400; i++) {
      const key = toLocalDateKey(d);
      if (!dayMetCalorieGoal({...perDay, dateKey: key})) break;
      streakDays++;
      d.setDate(d.getDate() - 1);
    }
  } else {
    d.setDate(d.getDate() - 1);
    for (let i = 0; i < 400; i++) {
      const key = toLocalDateKey(d);
      if (!dayMetCalorieGoal({...perDay, dateKey: key})) break;
      streakDays++;
      d.setDate(d.getDate() - 1);
    }
  }

  return {
    streakDays,
    includesToday: todayMet,
    todayAtRisk: calorieGoal > 0 && !todayMet,
    todayCalories: todayMacros.calories,
    calorieGoal,
    cheatDaysUsedThisWeek,
    cheatDaysPerWeek,
    cheatCreditsRemaining,
    cheatDayToday,
    canSpendCheatCreditToday,
  };
}

export const DEFAULT_CHEAT_DAYS_PER_WEEK = 1;

export function normalizeCheatDaysPerWeek(value: unknown): 1 | 2 {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 1) return 1;
  return 2;
}

function normalizeTrueDayRecord(raw: Record<string, unknown> | undefined): Record<string, true> {
  const next: Record<string, true> = {};
  if (!raw) return next;
  for (const k of Object.keys(raw).sort()) {
    if (raw[k]) next[k] = true;
  }
  return next;
}

function normalizeMealCountByDay(raw: Record<string, unknown> | undefined): Record<string, number> {
  const next: Record<string, number> = {};
  if (!raw) return next;
  for (const [k, v] of Object.entries(raw)) {
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (Number.isFinite(n) && n >= 0) next[k] = n;
  }
  return next;
}

export function emptyStreakBundle(): StreakBundle {
  return {
    mealCountByDay: {},
    cheatDays: {},
    fastingDays: {},
    vacationDays: {},
    vacationMode: false,
    cheatDaysPerWeek: DEFAULT_CHEAT_DAYS_PER_WEEK,
  };
}

export function normalizeStreakBundle(streak: StreakBundle | undefined): StreakBundle {
  if (!streak) return emptyStreakBundle();
  return {
    mealCountByDay: normalizeMealCountByDay(streak.mealCountByDay as Record<string, unknown>),
    cheatDays: normalizeTrueDayRecord(streak.cheatDays as Record<string, unknown>),
    fastingDays: normalizeTrueDayRecord(streak.fastingDays as Record<string, unknown>),
    vacationDays: normalizeTrueDayRecord(streak.vacationDays as Record<string, unknown>),
    vacationMode: streak.vacationMode === true,
    cheatDaysPerWeek: normalizeCheatDaysPerWeek(streak.cheatDaysPerWeek),
  };
}

/** @deprecated Use CalorieStreakSnapshot */
export type LoggingStreakSnapshot = CalorieStreakSnapshot;

/** @deprecated Use computeCalorieStreak */
export const computeLoggingStreak = computeCalorieStreak;

/** @deprecated */
export type StreakDayFlags = {
  cheatDays: Record<string, true>;
  fastingDays: Record<string, true>;
  vacationDays: Record<string, true>;
  vacationMode: boolean;
};

/** @deprecated */
export function streakBundleToDayFlags(streak: StreakBundle): StreakDayFlags {
  return {
    cheatDays: streak.cheatDays,
    fastingDays: streak.fastingDays,
    vacationDays: streak.vacationDays,
    vacationMode: streak.vacationMode,
  };
}
