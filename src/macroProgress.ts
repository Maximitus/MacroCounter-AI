import type {CalorieGoalMode} from './macroData/macroTypes.ts';

export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

export const MACRO_RING_COLORS: Record<MacroKey, string> = {
  calories: 'var(--color-accent)',
  protein: '#38bdf8',
  carbs: '#c4b5fd',
  fat: '#f472b6',
};

const MACRO_GOOD = '#34d399';
const MACRO_BAD = '#f87171';

export type MacroRingStatus = 'good' | 'bad' | 'neutral';

export function normalizeCalorieGoalMode(value: unknown): CalorieGoalMode {
  if (value === 'lose' || value === 'maintain' || value === 'gain') return value;
  return 'maintain';
}

export function calorieGoalModeLabel(mode: CalorieGoalMode): string {
  if (mode === 'lose') return 'Lose weight';
  if (mode === 'gain') return 'Gain weight';
  return 'Maintain weight';
}

export function macroGoalFieldLabel(key: MacroKey): string {
  if (key === 'carbs') return 'Carb limit';
  if (key === 'fat') return 'Fat limit';
  if (key === 'protein') return 'Protein goal';
  return 'Calories';
}

/** Ring color for daily macro progress wheels. */
export function macroRingColor(
  macroKey: MacroKey,
  current: number,
  goal: number,
  calorieGoalMode: CalorieGoalMode,
): string {
  const status = macroRingStatus(macroKey, current, goal, calorieGoalMode);
  if (status === 'good') return MACRO_GOOD;
  if (status === 'bad') return MACRO_BAD;
  return MACRO_RING_COLORS[macroKey];
}

export function macroRingStatus(
  macroKey: MacroKey,
  current: number,
  goal: number,
  calorieGoalMode: CalorieGoalMode,
): MacroRingStatus {
  if (goal <= 0) return 'neutral';
  const ratio = current / goal;

  if (macroKey === 'protein') {
    return ratio >= 1 ? 'good' : 'neutral';
  }

  if (macroKey === 'carbs' || macroKey === 'fat') {
    return ratio >= 1 ? 'bad' : 'neutral';
  }

  if (calorieGoalMode === 'gain') {
    return ratio >= 1 ? 'good' : 'neutral';
  }

  if (calorieGoalMode === 'lose') {
    if (ratio > 1) return 'bad';
    if (ratio >= 0.95 && ratio <= 1) return 'good';
    return 'neutral';
  }

  if (ratio > 1.05) return 'bad';
  if (ratio >= 0.95 && ratio <= 1.05) return 'good';
  return 'neutral';
}

/** Calendar day indicator: good = on track, bad = off track, null = no signal. */
export function macroDayIndicator(
  macroKey: MacroKey,
  total: number,
  goal: number,
  calorieGoalMode: CalorieGoalMode,
): 'good' | 'bad' | null {
  const status = macroRingStatus(macroKey, total, goal, calorieGoalMode);
  if (status === 'good') return 'good';
  if (status === 'bad') return 'bad';
  return null;
}
