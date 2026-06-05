import type {FriendWithStreak} from './socialTypes.ts';

function streakLabel(above: number, below: number): string {
  const parts: string[] = [];
  if (above > 0) parts.push(`${above} day${above === 1 ? '' : 's'} above calorie goal`);
  if (below > 0) parts.push(`${below} day${below === 1 ? '' : 's'} below calorie goal`);
  if (parts.length === 0) return 'No active calorie streak';
  return parts.join(' · ');
}

export function FriendStreakRow({friend}: {friend: FriendWithStreak}) {
  const above = friend.macroSocial?.streakAboveDays ?? 0;
  const below = friend.macroSocial?.streakBelowDays ?? 0;

  return (
    <>
      <p className="text-sm font-medium text-fg">{friend.displayName}</p>
      <p className="text-xs text-[var(--color-text-light)]">{streakLabel(above, below)}</p>
    </>
  );
}
