export type ProfileGender = 'female' | 'male' | 'prefer_not_to_say';
export type ProfileWeightUnit = 'lb' | 'kg';
export type ProfileHeightUnit = 'ft_in' | 'cm';
/** Somatotype hint for nutrition personalization — optional. */
export type ProfileBodyType = 'ectomorph' | 'mesomorph' | 'endomorph';

export type UserProfile = {
  displayName: string;
  friendCode: string;
  gender?: ProfileGender;
  /** Latest body weight in lb — shared profile; logs to Macro `weightLog` only when this value changes. */
  bodyWeightLb?: number;
  /** Height in centimeters — shared with Workout app. */
  heightCm?: number;
  /** Somatotype — shared with Workout app when set. */
  bodyType?: ProfileBodyType;
  /** Display unit for body weight — shared with Workout app. */
  weightUnit?: ProfileWeightUnit;
  /** Display unit for height — shared with Workout app. */
  heightUnit?: ProfileHeightUnit;
  updatedAt?: unknown;
};

export type FriendEntry = {
  uid: string;
  displayName: string;
};

export type MacroSocialPresence = {
  streakAboveDays: number;
  streakBelowDays: number;
  updatedAt?: unknown;
};

export type FriendWithStreak = FriendEntry & {
  macroSocial: MacroSocialPresence | null;
};
