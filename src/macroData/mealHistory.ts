import type {MealEntry} from './macroTypes.ts';

function localDayBounds(date = new Date()): {start: number; end: number} {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return {start: start.getTime(), end: end.getTime()};
}

/** Meal ids are millisecond timestamps from when the meal was logged. */
export function isTodayMealId(id: string, date = new Date()): boolean {
  const ts = Number(id);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  const {start, end} = localDayBounds(date);
  return ts >= start && ts <= end;
}

export function filterTodayMealHistory(history: MealEntry[], date = new Date()): MealEntry[] {
  return history.filter((meal) => isTodayMealId(meal.id, date));
}
