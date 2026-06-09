import {
  formatBodyWeight,
  formatHeight,
  formatProfileGender,
  resolveProfileHeightUnit,
  resolveProfileWeightUnit,
} from './profileBody.ts';
import type {UserProfile} from './socialTypes.ts';

export type ProfileAiSnapshot = Pick<
  UserProfile,
  'gender' | 'bodyWeightLb' | 'heightCm' | 'weightUnit' | 'heightUnit'
>;

export function profileAiSnapshot(profile: UserProfile | null | undefined): ProfileAiSnapshot | null {
  if (!profile) return null;
  const {gender, bodyWeightLb, heightCm, weightUnit, heightUnit} = profile;
  if (gender == null && bodyWeightLb == null && heightCm == null) return null;
  return {gender, bodyWeightLb, heightCm, weightUnit, heightUnit};
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
  if (lines.length === 0) return '';
  return `User profile (shared across Workout and Macro Counter):\n- ${lines.join('\n- ')}`;
}
