export type MacroTotals = {calories: number; protein: number; carbs: number; fat: number};

/** How calorie progress is judged: cap (lose), band (maintain), or target (gain). */
export type CalorieGoalMode = 'lose' | 'maintain' | 'gain';

export type MealEntry = {id: string; name: string; macros: MacroTotals};

export type FavoriteEntry = {name: string; macros: MacroTotals};

export type MacroTombstones = {
  history?: string[];
  favorites?: string[];
  dailyLog?: string[];
  weightLog?: string[];
};

export type MacroDataBundle = {
  schemaVersion: number;
  macros: MacroTotals;
  goals: MacroTotals;
  dailyLog: Record<string, MacroTotals>;
  weightGoal: number;
  calorieGoalMode: CalorieGoalMode;
  weightLog: Record<string, number>;
  favorites: FavoriteEntry[];
  history: MealEntry[];
  lastUpdatedDate: string;
  tombstones?: MacroTombstones;
};
