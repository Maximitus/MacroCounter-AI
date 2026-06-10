import type {MacroTotals, StreakBundle} from './macroData/macroTypes.ts';

export type StreakDayFlags = {
  cheatDays: Record<string, true>;
  fastingDays: Record<string, true>;
  vacationDays: Record<string, true>;
  vacationMode: boolean;
};

export type LoggingStreakSnapshot = {
  streakDays: number;
  /** True when today is included in the streak count. */
  includesToday: boolean;
  /** True when today has no meals and no protective flags yet. */
  todayAtRisk: boolean;
  mealsLoggedToday: number;
  cheatDaysUsedThisWeek: number;
  cheatDaysPerWeek: number;
  canUseCheatDayToday: boolean;
  fastingToday: boolean;
  vacationToday: boolean;
  cheatDayToday: boolean;
  vacationMode: boolean;
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

export function mealsLoggedOnDay(args: {
  dateKey: string;
  todayKey: string;
  todayMealCount: number;
  mealCountByDay: Record<string, number>;
  dailyLog: Record<string, MacroTotals>;
}): number {
  const {dateKey, todayKey, todayMealCount, mealCountByDay, dailyLog} = args;
  if (dateKey === todayKey) return todayMealCount;
  if (mealCountByDay[dateKey] != null) return mealCountByDay[dateKey]!;
  if ((dailyLog[dateKey]?.calories ?? 0) > 0) return 1;
  return 0;
}

function isVacationDay(dateKey: string, flags: StreakDayFlags): boolean {
  return flags.vacationDays[dateKey] === true;
}

function dayQualifies(args: {
  dateKey: string;
  todayKey: string;
  todayMealCount: number;
  mealCountByDay: Record<string, number>;
  dailyLog: Record<string, MacroTotals>;
  flags: StreakDayFlags;
  cheatDaysPerWeek: number;
}): boolean {
  const meals = mealsLoggedOnDay(args);
  if (meals > 0) return true;
  if (isVacationDay(args.dateKey, args.flags)) return true;
  if (args.flags.fastingDays[args.dateKey]) return true;
  if (args.flags.cheatDays[args.dateKey]) {
    return cheatDaysUsedInWeek(args.flags.cheatDays, args.dateKey) <= args.cheatDaysPerWeek;
  }
  return false;
}

export function computeLoggingStreak(args: {
  todayKey: string;
  todayMealCount: number;
  mealCountByDay: Record<string, number>;
  dailyLog: Record<string, MacroTotals>;
  flags: StreakDayFlags;
  cheatDaysPerWeek: number;
}): LoggingStreakSnapshot {
  const {todayKey, todayMealCount, mealCountByDay, dailyLog, flags, cheatDaysPerWeek} = args;
  const perDay = {
    todayKey,
    todayMealCount,
    mealCountByDay,
    dailyLog,
    flags,
    cheatDaysPerWeek,
  };

  const todayQualifies = dayQualifies({...perDay, dateKey: todayKey});
  const mealsLoggedToday = todayMealCount;
  const cheatDaysUsedThisWeek = cheatDaysUsedInWeek(flags.cheatDays, todayKey);
  const cheatDayToday = flags.cheatDays[todayKey] === true;
  const fastingToday = flags.fastingDays[todayKey] === true;
  const vacationToday = isVacationDay(todayKey, flags);
  const canUseCheatDayToday =
    mealsLoggedToday === 0 &&
    !cheatDayToday &&
    cheatDaysUsedThisWeek < cheatDaysPerWeek;

  let streakDays = 0;
  const d = new Date(`${todayKey}T12:00:00`);

  if (todayQualifies) {
    for (let i = 0; i < 400; i++) {
      const key = toLocalDateKey(d);
      if (!dayQualifies({...perDay, dateKey: key})) break;
      streakDays++;
      d.setDate(d.getDate() - 1);
    }
  } else {
    d.setDate(d.getDate() - 1);
    for (let i = 0; i < 400; i++) {
      const key = toLocalDateKey(d);
      if (!dayQualifies({...perDay, dateKey: key})) break;
      streakDays++;
      d.setDate(d.getDate() - 1);
    }
  }

  return {
    streakDays,
    includesToday: todayQualifies,
    todayAtRisk: !todayQualifies && mealsLoggedToday === 0 && !fastingToday && !vacationToday && !cheatDayToday,
    mealsLoggedToday,
    cheatDaysUsedThisWeek,
    cheatDaysPerWeek,
    canUseCheatDayToday,
    fastingToday,
    vacationToday,
    cheatDayToday,
    vacationMode: flags.vacationMode,
  };
}

export const DEFAULT_CHEAT_DAYS_PER_WEEK = 1;

export function normalizeCheatDaysPerWeek(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n)) return DEFAULT_CHEAT_DAYS_PER_WEEK;
  return Math.min(7, Math.max(0, Math.round(n)));
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

export function streakBundleToDayFlags(streak: StreakBundle): StreakDayFlags {
  return {
    cheatDays: streak.cheatDays,
    fastingDays: streak.fastingDays,
    vacationDays: streak.vacationDays,
    vacationMode: streak.vacationMode,
  };
}
