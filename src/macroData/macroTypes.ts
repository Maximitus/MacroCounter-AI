export type MacroTotals = {calories: number; protein: number; carbs: number; fat: number};

/** How calorie progress is judged: cap (lose), band (maintain), or target (gain). */
export type CalorieGoalMode = 'lose' | 'maintain' | 'gain';

export type MealEntry = {id: string; name: string; macros: MacroTotals};

export type FavoriteEntry = {name: string; macros: MacroTotals};

/** Streak settings (cheat credits) and legacy fields for cloud sync. */
export type StreakBundle = {
  mealCountByDay: Record<string, number>;
  cheatDays: Record<string, true>;
  fastingDays: Record<string, true>;
  vacationDays: Record<string, true>;
  vacationMode: boolean;
  cheatDaysPerWeek: number;
};

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
  /** ISO date (YYYY-MM-DD) by which the user wants to reach weightGoal; empty if unset. */
  weightGoalDate: string;
  calorieGoalMode: CalorieGoalMode;
  weightLog: Record<string, number>;
  favorites: FavoriteEntry[];
  history: MealEntry[];
  lastUpdatedDate: string;
  streak?: StreakBundle;
  tombstones?: MacroTombstones;
};
