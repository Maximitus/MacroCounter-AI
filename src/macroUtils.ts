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

/** Daily goals: digits only, no leading-zero quirks from type="number". */
export function parseGoalIntInput(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Manual macro grams / kcal: digits and at most one decimal point. */
export function sanitizeMacroAmountRaw(raw: string): string {
  let s = raw.replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  }
  return s;
}

/** Numeric value for storage (trailing "." still parses as the whole number so far). */
export function parseMacroAmountInput(raw: string): number {
  const s = sanitizeMacroAmountRaw(raw);
  if (s === '' || s === '.') return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
