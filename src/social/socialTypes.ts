export type UserProfile = {
  displayName: string;
  friendCode: string;
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
