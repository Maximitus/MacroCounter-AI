/**
 * Gemini prompts for JSON-mode meal and goal analysis.
 * User-provided strings are embedded via JSON.stringify to avoid quote-injection issues.
 */

const JSON_ONLY =
  'Respond with valid JSON only: no markdown code fences, no commentary before or after.';

const ENERGY_CHECK =
  'Keep calories consistent with macros: total kcal should be close to 4×(protein g + carbs g) + 9×(fat g), within about ±12% (rounding allowed).';

const GRAMS_RULE =
  'Report protein, carbohydrates, and fat in grams (total carbs). Use non-negative numbers; one decimal place is fine when helpful.';

const MEAL_ITEM_SHAPE =
  '[{ "name": string, "portion": string, "calories": number, "protein": number, "carbs": number, "fat": number }]';

const MACRO_TOTAL_SHAPE = '{ "calories": number, "protein": number, "carbs": number, "fat": number }';

/** Macro goals response may include weights the user mentioned (pounds). */
const MACRO_GOALS_AI_SHAPE = [
  '{',
  '  "calories": number,',
  '  "protein": number,',
  '  "carbs": number,',
  '  "fat": number,',
  '  "currentWeightLb": number | null,',
  '  "targetWeightLb": number | null,',
  '  "calorieGoalMode": "lose" | "maintain" | "gain"',
  '}',
].join('\n');

/** Per-item analysis from a text description (main “Analyze” flow). */
export function promptMealItemsFromDescription(userDescription: string): string {
  const desc = JSON.stringify(userDescription);
  return [
    'You are a careful nutrition assistant estimating per-item macros for a food log.',
    '',
    'Parse the meal description. Produce one object per distinct food or separable component when that improves accuracy (e.g. sandwich: bread, fillings).',
    'Honor explicit quantities and units. If portions are missing, use typical US home or restaurant portions and describe your assumption in "portion" (with units: g, oz, cups, pieces, etc.).',
    ENERGY_CHECK,
    GRAMS_RULE,
    'If the text is not about food or nothing can be estimated, return an empty array [].',
    JSON_ONLY,
    `Output shape: ${MEAL_ITEM_SHAPE}`,
    '',
    `User meal description: ${desc}`,
  ].join('\n');
}

/** Per-item analysis from a food photo (gallery / camera file flow). */
export function promptMealItemsFromImage(): string {
  return [
    'You are a careful nutrition assistant estimating per-item macros for a food log from a photograph.',
    '',
    'Identify visible foods and estimate amounts. Use scale cues when possible: plate or bowl size, utensils, hands, packaging, or known items (e.g. standard cans).',
    'If amount is uncertain, pick a reasonable middle estimate and state the uncertainty briefly in "portion".',
    'Include obvious added fats (butter, oil, dressing, sauce) on the relevant item or as its own row when significant.',
    ENERGY_CHECK,
    GRAMS_RULE,
    'If the image shows no food or is unusable, return an empty array [].',
    JSON_ONLY,
    `Output shape: ${MEAL_ITEM_SHAPE}`,
  ].join('\n');
}

/** Single totals for “favorite from description” modal. */
export function promptAggregateMacrosFromDescription(userDescription: string): string {
  const desc = JSON.stringify(userDescription);
  return [
    'You are a careful nutrition assistant. Estimate TOTAL nutrition for the entire meal described below as one combined entry.',
    '',
    'Combine all items into a single set of totals. Apply the same estimation standards as a food label.',
    ENERGY_CHECK,
    GRAMS_RULE,
    'If the text is not food or is empty, return zeros for all numeric fields.',
    JSON_ONLY,
    `Output shape: ${MACRO_TOTAL_SHAPE}`,
    '',
    `Meal description: ${desc}`,
  ].join('\n');
}

/** Single totals for “favorite from picture” modal. */
export function promptAggregateMacrosFromImage(): string {
  return [
    'You are a careful nutrition assistant. Estimate TOTAL nutrition for all visible food in the image as one combined entry.',
    '',
    'Sum everything edible in the frame into one set of totals. Use visible scale cues; prefer a single conservative total when the scene is ambiguous.',
    ENERGY_CHECK,
    GRAMS_RULE,
    'If there is no food, return zeros for all numeric fields.',
    JSON_ONLY,
    `Output shape: ${MACRO_TOTAL_SHAPE}`,
  ].join('\n');
}

/** Snack recommendation from on-hand ingredients + remaining daily macro budget. */
const SNACK_AI_SHAPE = [
  '{',
  '  "name": string,',
  '  "ingredientsUsed": [{ "name": string, "amount": string }],',
  '  "instructions": string,',
  '  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number },',
  '  "notes": string',
  '}',
].join('\n');

export function promptSnackFromIngredients(args: {
  availableIngredients: string[];
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
}): string {
  const payload = JSON.stringify({
    availableIngredients: args.availableIngredients,
    remainingBudget: {
      calories: Math.max(0, Math.round(args.remainingCalories)),
      protein: Math.max(0, Math.round(args.remainingProtein)),
      carbs: Math.max(0, Math.round(args.remainingCarbs)),
      fat: Math.max(0, Math.round(args.remainingFat)),
    },
  });
  return [
    'You are a practical nutrition coach helping a user pick a small snack that fits their remaining daily macro budget.',
    '',
    'Hard constraints:',
    '- Use ONLY ingredients from `availableIngredients`. Do not invent ingredients the user did not list.',
    '- Snack `macros.calories` MUST be at or below `remainingBudget.calories`. Aim for roughly 60-90% of that budget unless a smaller portion clearly makes more sense.',
    '- The snack should be assemblable in under 5 minutes with no real cooking unless eggs/oats/protein powder etc. are available.',
    '',
    'Soft preferences:',
    '- If `remainingBudget.protein` > 0, prefer a snack that provides a meaningful share of it (target close to remainingProtein/4 grams or more) WITHOUT exceeding the calorie budget.',
    '- Prefer minimally processed, satisfying combinations (e.g. protein + fiber).',
    '- Realistic everyday portions (cups, tbsp, oz, pieces). Put exact amount in `ingredientsUsed[i].amount`.',
    '',
    'Output:',
    '- `name`: short, descriptive snack name (e.g. "Apple + peanut butter").',
    '- `instructions`: 1-4 short sentences on how to assemble.',
    '- `macros`: totals for the whole snack in the same units as the user (kcal, grams).',
    '- `notes`: optional one-line tip (protein boost, swap, etc.). Empty string if nothing useful to add.',
    '',
    'If NO feasible snack exists from these ingredients within the calorie budget, return name="" and ingredientsUsed=[] with zero macros and a short reason in `notes`.',
    ENERGY_CHECK,
    GRAMS_RULE,
    JSON_ONLY,
    `Output shape: ${SNACK_AI_SHAPE}`,
    '',
    `Inputs: ${payload}`,
  ].join('\n');
}

/** Daily macro goal suggestions from free-form user notes. */
export function promptDailyMacroGoals(userNotes: string): string {
  const notes = JSON.stringify(userNotes);
  return [
    'You are a practical nutrition coach helping set daily macro targets for healthy adults (general wellness guidance, not medical treatment).',
    '',
    'From the user notes, infer appropriate daily calories, protein (g), carbs (g), and fat (g).',
    'Use evidence-informed ranges: prioritize adequate protein, balanced fat, and carbs that fit the stated goal (e.g. fat loss, maintenance, muscle gain) when inferable.',
    'If age, sex, weight, height, or activity are missing, assume typical values consistent with the goal and reflect that in reasonable round numbers.',
    '',
    'Also read the notes for body weight. All weights in the JSON must be in pounds (lb).',
    '- If the user states their current body weight (e.g. "I weigh 180", "currently 82 kg"), set currentWeightLb to that value converted to pounds when needed (1 kg ≈ 2.20462 lb). Use null if not stated.',
    '- If the user states a target or goal weight (e.g. "want to get to 165", "goal 75 kg"), set targetWeightLb similarly in pounds. Use null if not stated.',
    '- Use one decimal when helpful; avoid inventing weights that were not implied.',
    '',
    'Set calorieGoalMode from the user goal:',
    '- "lose" for fat loss / cut / deficit',
    '- "gain" for muscle gain / bulk / surplus',
    '- "maintain" when maintaining weight or goal is unclear',
    JSON_ONLY,
    `Output shape: ${MACRO_GOALS_AI_SHAPE}`,
    '',
    `User notes: ${notes}`,
  ].join('\n');
}
