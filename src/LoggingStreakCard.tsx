import {ChevronRight, Flame} from 'lucide-react';
import type {CalorieStreakSnapshot} from './loggingStreak.ts';
import {calorieGoalModeLabel} from './macroProgress.ts';
import type {CalorieGoalMode} from './macroData/macroTypes.ts';

export function StreakCard({
  snapshot,
  calorieGoalMode,
  onOpen,
}: {
  snapshot: CalorieStreakSnapshot;
  calorieGoalMode: CalorieGoalMode;
  onOpen: () => void;
}) {
  const {streakDays, todayAtRisk, includesToday, calorieGoal} = snapshot;
  const label = streakDays === 1 ? '1 day streak' : `${streakDays} day streak`;

  let subtitle = 'Meet your goal each day to build a streak';
  if (calorieGoal <= 0) {
    subtitle = 'Set a goal to start a streak';
  } else if (todayAtRisk) {
    subtitle = `Hit your ${calorieGoalModeLabel(calorieGoalMode).toLowerCase()} goal to keep it going`;
  } else if (includesToday) {
    subtitle = 'Goal met today';
  } else if (streakDays > 0) {
    subtitle = 'Streak through yesterday — meet today\'s goal to extend it';
  }

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
        <p className="mt-0.5 text-sm text-[var(--color-text-light)]">{subtitle}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-light)]" aria-hidden />
    </button>
  );
}

/** @deprecated Use StreakCard */
export const CalorieStreakCard = StreakCard;
export const LoggingStreakCard = StreakCard;
