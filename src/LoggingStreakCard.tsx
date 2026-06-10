import {ChevronRight, Flame} from 'lucide-react';
import type {LoggingStreakSnapshot} from './loggingStreak.ts';

export function LoggingStreakCard({
  snapshot,
  onOpen,
}: {
  snapshot: LoggingStreakSnapshot;
  onOpen: () => void;
}) {
  const {streakDays, todayAtRisk, includesToday} = snapshot;
  const label =
    streakDays === 1 ? '1 day streak' : `${streakDays} day streak`;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="glass flex w-full items-center gap-4 rounded-2xl border border-[var(--color-accent)]/10 p-4 text-left shadow-lg accent-glow transition hover:border-[var(--color-accent)]/25 active:opacity-90"
      aria-label={`${label}. Open streak details.`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
        <Flame className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold tabular-nums text-fg brand-font">{label}</p>
        <p className="mt-0.5 text-sm text-[var(--color-text-light)]">
          {todayAtRisk
            ? 'Log a meal, mark fasting, or use a cheat day to keep it going'
            : includesToday
              ? 'You logged today — nice work'
              : streakDays > 0
                ? 'Streak through yesterday — log today to extend it'
                : 'Log a meal each day to build your streak'}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-light)]" aria-hidden />
    </button>
  );
}
