import type {ProfileBodyType, ProfileGender, ProfileHeightUnit, ProfileWeightUnit} from './socialTypes.ts';

/** Firestore `users/{uid}/profile/main` body fields — keep identical in Macro Counter. */
export const PROFILE_FIELD_BODY_WEIGHT_LB = 'bodyWeightLb';
export const PROFILE_FIELD_HEIGHT_CM = 'heightCm';
export const PROFILE_FIELD_GENDER = 'gender';
export const PROFILE_FIELD_BODY_TYPE = 'bodyType';
export const PROFILE_FIELD_WEIGHT_UNIT = 'weightUnit';
export const PROFILE_FIELD_HEIGHT_UNIT = 'heightUnit';

const LB_PER_KG = 2.2046226218;

export const DEFAULT_PROFILE_WEIGHT_UNIT: ProfileWeightUnit = 'lb';
export const DEFAULT_PROFILE_HEIGHT_UNIT: ProfileHeightUnit = 'ft_in';

const GENDER_LABELS: Record<ProfileGender, string> = {
  female: 'Female',
  male: 'Male',
  prefer_not_to_say: 'Prefer not to say',
};

const BODY_TYPE_LABELS: Record<ProfileBodyType, string> = {
  ectomorph: 'Ectomorph',
  mesomorph: 'Mesomorph',
  endomorph: 'Endomorph',
};

export function normalizeProfileBodyType(raw: unknown): ProfileBodyType | undefined {
  if (raw === 'ectomorph' || raw === 'mesomorph' || raw === 'endomorph') return raw;
  return undefined;
}

export function formatProfileGender(gender: ProfileGender | undefined): string | null {
  if (!gender) return null;
  return GENDER_LABELS[gender];
}

export function formatProfileBodyType(bodyType: ProfileBodyType | undefined): string | null {
  if (!bodyType) return null;
  return BODY_TYPE_LABELS[bodyType];
}

export function roundBodyWeightLb(lb: number): number {
  return Math.ceil(lb * 10) / 10;
}

export function heightCmToFeetInches(cm: number): {feet: number; inches: number} {
  const totalIn = cm / 2.54;
  const feet = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn - feet * 12);
  if (inches === 12) return {feet: feet + 1, inches: 0};
  return {feet, inches};
}

export function feetInchesToHeightCm(feet: number, inches: number): number {
  const totalIn = Math.max(0, feet) * 12 + Math.max(0, inches);
  return Math.round((totalIn * 2.54) * 10) / 10;
}

export function formatHeightFromCm(cm: number | undefined): string | null {
  if (cm == null || cm <= 0) return null;
  const {feet, inches} = heightCmToFeetInches(cm);
  return `${feet}'${inches}"`;
}

export function formatBodyWeightLb(lb: number | undefined): string | null {
  if (lb == null || lb <= 0) return null;
  const rounded = roundBodyWeightLb(lb);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function bodyWeightFromLb(lb: number, unit: ProfileWeightUnit): number {
  const value = unit === 'lb' ? lb : lb / LB_PER_KG;
  return roundBodyWeightLb(value);
}

export function bodyWeightToLb(value: number, unit: ProfileWeightUnit): number {
  const lb = unit === 'lb' ? value : value * LB_PER_KG;
  return roundBodyWeightLb(lb);
}

export function formatBodyWeight(
  lb: number | undefined,
  unit: ProfileWeightUnit = DEFAULT_PROFILE_WEIGHT_UNIT,
): string | null {
  if (lb == null || lb <= 0) return null;
  const display = bodyWeightFromLb(lb, unit);
  const text = Number.isInteger(display) ? String(display) : display.toFixed(1);
  return `${text} ${unit}`;
}

export function formatHeight(
  cm: number | undefined,
  unit: ProfileHeightUnit = DEFAULT_PROFILE_HEIGHT_UNIT,
): string | null {
  if (cm == null || cm <= 0) return null;
  if (unit === 'cm') return `${Math.round(cm)} cm`;
  return formatHeightFromCm(cm);
}

export function resolveProfileWeightUnit(unit: ProfileWeightUnit | undefined): ProfileWeightUnit {
  return unit === 'kg' ? 'kg' : DEFAULT_PROFILE_WEIGHT_UNIT;
}

export function resolveProfileHeightUnit(unit: ProfileHeightUnit | undefined): ProfileHeightUnit {
  return unit === 'cm' ? 'cm' : DEFAULT_PROFILE_HEIGHT_UNIT;
}
