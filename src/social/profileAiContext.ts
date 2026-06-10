import {
  formatBodyWeight,
  formatHeight,
  formatProfileBodyType,
  formatProfileGender,
  resolveProfileHeightUnit,
  resolveProfileWeightUnit,
} from './profileBody.ts';
import type {UserProfile} from './socialTypes.ts';

export type ProfileAiSnapshot = Pick<
  UserProfile,
  'gender' | 'bodyWeightLb' | 'heightCm' | 'bodyType' | 'weightUnit' | 'heightUnit'
>;

export type ProfileAiSnapshotOptions = {
  /** Used when profile body weight is unset (e.g. guest weight log). */
  fallbackWeightLb?: number | null;
};

export function profileAiSnapshot(
  profile: UserProfile | null | undefined,
  options?: ProfileAiSnapshotOptions,
): ProfileAiSnapshot | null {
  const profileLb =
    profile?.bodyWeightLb != null && profile.bodyWeightLb > 0 ? profile.bodyWeightLb : undefined;
  const fallbackLb =
    options?.fallbackWeightLb != null && options.fallbackWeightLb > 0
      ? options.fallbackWeightLb
      : undefined;
  const bodyWeightLb = profileLb ?? fallbackLb;

  const gender = profile?.gender;
  const heightCm = profile?.heightCm != null && profile.heightCm > 0 ? profile.heightCm : undefined;
  const bodyType = profile?.bodyType;
  const weightUnit = profile?.weightUnit;
  const heightUnit = profile?.heightUnit;

  if (gender == null && bodyWeightLb == null && heightCm == null && bodyType == null) {
    return null;
  }

  return {gender, bodyWeightLb, heightCm, bodyType, weightUnit, heightUnit};
}

/** Plain-text profile block for AI system prompts (Workout + Macro). */
export function buildProfileAiBlock(profile: ProfileAiSnapshot | null | undefined): string {
  if (!profile) return '';
  const lines: string[] = [];
  const gender = formatProfileGender(profile.gender);
  if (gender) lines.push(`Gender: ${gender}`);
  const weight = formatBodyWeight(
    profile.bodyWeightLb,
    resolveProfileWeightUnit(profile.weightUnit),
  );
  if (weight) lines.push(`Body weight: ${weight}`);
  const height = formatHeight(profile.heightCm, resolveProfileHeightUnit(profile.heightUnit));
  if (height) lines.push(`Height: ${height}`);
  const bodyType = formatProfileBodyType(profile.bodyType);
  if (bodyType) lines.push(`Somatotype: ${bodyType}`);
  if (lines.length === 0) return '';
  return `User profile (shared across Workout and Macro Counter):\n- ${lines.join('\n- ')}\n- Use this profile data when personalizing nutrition advice. Body type is a general frame/metabolism hint—nudge carb/fat balance and calorie estimates modestly when relevant, not as rigid rules.`;
}
