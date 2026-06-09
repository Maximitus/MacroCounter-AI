import {calorieGoalModeLabel} from './macroProgress.ts';
import type {CalorieGoalMode, MacroTotals} from './macroData/macroTypes.ts';
import {buildProfileAiBlock, type ProfileAiSnapshot} from './social/profileAiContext.ts';

export type NutritionCoachMeal = {
  name: string;
  loggedAt: string;
  macros: MacroTotals;
};

export type NutritionCoachDayTotals = {
  date: string;
  macros: MacroTotals;
};

export type NutritionCoachInputs = {
  goals: MacroTotals;
  calorieGoalMode: CalorieGoalMode;
  todayTotals: MacroTotals;
  todayMeals: NutritionCoachMeal[];
  recentDailyTotals: NutritionCoachDayTotals[];
  profile?: ProfileAiSnapshot | null;
};

function formatMacroLine(m: MacroTotals): string {
  return `${m.calories} kcal, ${m.protein}g protein, ${m.carbs}g carbs, ${m.fat}g fat`;
}

function remaining(goal: number, current: number): number {
  return Math.round(goal - current);
}

export function recentDailyTotalsFromLog(
  dailyLog: Record<string, MacroTotals>,
  days = 7,
  todayKey?: string,
): NutritionCoachDayTotals[] {
  const today = todayKey ?? new Date().toISOString().slice(0, 10);
  const entries = Object.entries(dailyLog)
    .filter(([key]) => key !== today)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, days)
    .map(([date, macros]) => ({date, macros}));
  return entries;
}

/** System prompt + live nutrition context for the AI Coach chat. */
export function buildNutritionCoachSystemInstruction(inputs: NutritionCoachInputs): string {
  const sections: string[] = [];

  sections.push(`You are a supportive nutrition coach inside the Macro Counter app. Use the CONTEXT below to personalize answers.

You can help with: meal ideas that fit remaining macros; understanding daily progress vs goals; balancing protein, carbs, and fat; simple habit tips; and explaining what the user's logged meals add up to. You are not a doctor or registered dietitian—do not diagnose conditions or prescribe medical diets. Urge professional care for eating disorders, allergies, or medical nutrition needs.

Keep replies concise and actionable unless the user asks for detail.`);

  sections.push('\n### CONTEXT (updated each message)\n');

  sections.push(`**Daily goals**
- Calorie goal mode: ${calorieGoalModeLabel(inputs.calorieGoalMode)}
- ${formatMacroLine(inputs.goals)}
- Carbs and fat are daily limits (going over is off-plan); protein is a target to reach.`);

  const remain = {
    calories: remaining(inputs.goals.calories, inputs.todayTotals.calories),
    protein: remaining(inputs.goals.protein, inputs.todayTotals.protein),
    carbs: remaining(inputs.goals.carbs, inputs.todayTotals.carbs),
    fat: remaining(inputs.goals.fat, inputs.todayTotals.fat),
  };

  sections.push(`\n**Today so far**
- Logged: ${formatMacroLine(inputs.todayTotals)}
- Remaining vs goals: ${remain.calories} kcal, ${remain.protein}g protein, ${remain.carbs}g carbs, ${remain.fat}g fat`);

  if (inputs.todayMeals.length === 0) {
    sections.push('\n**Today\'s meals:** none logged yet.');
  } else {
    const lines = inputs.todayMeals
      .slice(0, 20)
      .map(
        (meal) =>
          `  - ${meal.name} (${meal.loggedAt}) — ${formatMacroLine(meal.macros)}`,
      )
      .join('\n');
    sections.push(`\n**Today's meals (newest last, up to 20)**\n${lines}`);
  }

  if (inputs.recentDailyTotals.length === 0) {
    sections.push('\n**Recent prior days:** no archived daily totals yet.');
  } else {
    const lines = inputs.recentDailyTotals
      .map((day) => `  - ${day.date}: ${formatMacroLine(day.macros)}`)
      .join('\n');
    sections.push(`\n**Recent prior days (daily totals, newest first)**\n${lines}`);
  }

  const profileBlock = buildProfileAiBlock(inputs.profile);
  if (profileBlock) {
    sections.push(`\n${profileBlock}`);
  }

  return sections.join('\n');
}
