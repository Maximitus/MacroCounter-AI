import type {CalorieGoalMode} from './macroData/macroTypes.ts';

export type GoalMacros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const MIN_CALORIES_STRICT = 1200;
const MIN_CALORIES_LOSS = 1500;
const MIN_PROTEIN_G = 50;
const AGGRESSIVE_LOSS_RATIO = 0.15;

/** Infer lose / maintain / gain from current vs target body weight (lb). */
export function calorieGoalModeFromWeightDelta(
  currentLb: number | null,
  targetLb: number | null,
): CalorieGoalMode | null {
  if (currentLb == null || targetLb == null || currentLb <= 0 || targetLb <= 0) return null;
  const delta = targetLb - currentLb;
  if (delta <= -1) return 'lose';
  if (delta >= 1) return 'gain';
  return 'maintain';
}

/** Return human-readable concerns when goals may be unhealthy. Empty = no warning. */
export function assessGoalHealth(args: {
  goals: GoalMacros;
  weightGoal: number;
  currentWeightLb: number | null;
  calorieGoalMode: CalorieGoalMode;
}): string[] {
  const concerns: string[] = [];
  const {goals, weightGoal, currentWeightLb, calorieGoalMode} = args;

  if (goals.calories > 0 && goals.calories < MIN_CALORIES_STRICT) {
    concerns.push(
      `Daily calories (${Math.round(goals.calories)} kcal) are below ${MIN_CALORIES_STRICT} kcal, which may be unsafe for most adults.`,
    );
  } else if (
    calorieGoalMode === 'lose' &&
    goals.calories > 0 &&
    goals.calories < MIN_CALORIES_LOSS
  ) {
    concerns.push(
      `A weight-loss calorie target of ${Math.round(goals.calories)} kcal/day is below common minimum guidelines (${MIN_CALORIES_LOSS} kcal).`,
    );
  }

  if (goals.protein > 0 && goals.protein < MIN_PROTEIN_G) {
    concerns.push(
      `Protein goal (${Math.round(goals.protein)} g) is very low and may not support muscle or recovery.`,
    );
  }

  if (weightGoal > 0 && currentWeightLb != null && currentWeightLb > 0) {
    const lossRatio = (currentWeightLb - weightGoal) / currentWeightLb;
    if (lossRatio > AGGRESSIVE_LOSS_RATIO) {
      concerns.push(
        `Target weight is more than ${Math.round(AGGRESSIVE_LOSS_RATIO * 100)}% below your current weight — consider a smaller, gradual goal.`,
      );
    }
  }

  if (weightGoal > 0 && weightGoal < 80) {
    concerns.push(
      `Goal weight (${Math.round(weightGoal)} lb) is unusually low — double-check this is intentional.`,
    );
  }

  if (currentWeightLb != null && currentWeightLb > 0 && goals.protein > 0) {
    const minProteinForWeight = currentWeightLb * 0.6;
    if (goals.protein < minProteinForWeight) {
      concerns.push(
        `Protein goal (${Math.round(goals.protein)} g) is below a common minimum of ~0.6 g per lb of body weight for your size.`,
      );
    }
  }

  return concerns;
}
