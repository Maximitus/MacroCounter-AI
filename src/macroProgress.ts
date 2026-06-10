import type {CalorieGoalMode} from './macroData/macroTypes.ts';

export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

export const MACRO_RING_COLORS: Record<MacroKey, string> = {
  calories: 'var(--color-accent)',
  protein: '#38bdf8',
  carbs: '#c4b5fd',
  fat: '#f472b6',
};

/** Progress ring fill when the goal is not met. */
export const MACRO_RING_UNMET = '#ffffff';

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

/** True when daily progress meets the macro goal for the current calorie mode. */
export function macroGoalMet(
  macroKey: MacroKey,
  current: number,
  goal: number,
  calorieGoalMode: CalorieGoalMode,
): boolean {
  if (goal <= 0) return false;

  if (macroKey === 'protein') {
    return current >= goal;
  }

  if (macroKey === 'carbs' || macroKey === 'fat') {
    return current <= goal;
  }

  if (calorieGoalMode === 'lose') {
    return current <= goal;
  }

  if (calorieGoalMode === 'gain') {
    return current >= goal;
  }

  const ratio = current / goal;
  return ratio >= 0.95 && ratio <= 1.05;
}

/** Ring / indicator color: macro color when met, white when not. */
export function macroRingColor(
  macroKey: MacroKey,
  current: number,
  goal: number,
  calorieGoalMode: CalorieGoalMode,
): string {
  return macroGoalMet(macroKey, current, goal, calorieGoalMode)
    ? MACRO_RING_COLORS[macroKey]
    : MACRO_RING_UNMET;
}

/** Calendar day indicator: met goal, did not meet, or no signal. */
export function macroDayIndicator(
  macroKey: MacroKey,
  total: number,
  goal: number,
  calorieGoalMode: CalorieGoalMode,
): 'met' | 'unmet' | null {
  if (goal <= 0 || total <= 0) return null;
  return macroGoalMet(macroKey, total, goal, calorieGoalMode) ? 'met' : 'unmet';
}

/** Which chevron direction to show for met vs unmet (varies by macro and calorie mode). */
export function macroIndicatorChevron(
  macroKey: MacroKey,
  calorieGoalMode: CalorieGoalMode,
  kind: 'met' | 'unmet',
  current?: number,
  goal?: number,
): 'up' | 'down' {
  const higherIsMet =
    macroKey === 'protein' ||
    (macroKey === 'calories' && calorieGoalMode === 'gain');
  const lowerIsMet =
    macroKey === 'carbs' ||
    macroKey === 'fat' ||
    (macroKey === 'calories' && calorieGoalMode === 'lose');

  if (kind === 'met') {
    if (lowerIsMet) return 'down';
    if (higherIsMet) return 'up';
    return 'up';
  }

  if (lowerIsMet) return 'up';
  if (higherIsMet) return 'down';

  if (current != null && goal != null && goal > 0) {
    return current > goal ? 'up' : 'down';
  }
  return 'down';
}

export function macroGoalMetLegendLabel(
  macroKey: MacroKey,
  calorieGoalMode: CalorieGoalMode,
): string {
  if (macroKey === 'protein') return 'At or above goal';
  if (macroKey === 'carbs' || macroKey === 'fat') return 'At or under limit';
  if (calorieGoalMode === 'lose') return 'At or under goal';
  if (calorieGoalMode === 'gain') return 'At or above goal';
  return 'Near goal';
}

export function macroGoalUnmetLegendLabel(
  macroKey: MacroKey,
  calorieGoalMode: CalorieGoalMode,
): string {
  if (macroKey === 'protein') return 'Below goal';
  if (macroKey === 'carbs' || macroKey === 'fat') return 'Over limit';
  if (calorieGoalMode === 'lose') return 'Over goal';
  if (calorieGoalMode === 'gain') return 'Below goal';
  return 'Off target';
}
