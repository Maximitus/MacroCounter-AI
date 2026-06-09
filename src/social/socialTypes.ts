export type ProfileGender = 'female' | 'male' | 'prefer_not_to_say';
export type ProfileWeightUnit = 'lb' | 'kg';
export type ProfileHeightUnit = 'ft_in' | 'cm';

export type UserProfile = {
  displayName: string;
  friendCode: string;
  gender?: ProfileGender;
  /** Latest body weight in lb — synced with Macro `weightLog`. */
  bodyWeightLb?: number;
  /** Height in centimeters — shared with Workout app. */
  heightCm?: number;
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
