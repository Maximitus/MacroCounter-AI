/** Ceil to one decimal place; stabilizes binary float noise before ceil. */
export function ceilToOneDecimal(n: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  const stable = Math.round(x * 1e6) / 1e6;
  return Math.ceil(stable * 10) / 10;
}

export type MacroFields = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function normalizeAiMacros(m: Partial<Record<keyof MacroFields, unknown>>): MacroFields {
  return {
    calories: ceilToOneDecimal(Number(m.calories)),
    protein: ceilToOneDecimal(Number(m.protein)),
    carbs: ceilToOneDecimal(Number(m.carbs)),
    fat: ceilToOneDecimal(Number(m.fat)),
  };
}

/** One decimal when needed; whole numbers without a trailing ".0". */
export function formatMacroAmount(n: number): string {
  const v = ceilToOneDecimal(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
