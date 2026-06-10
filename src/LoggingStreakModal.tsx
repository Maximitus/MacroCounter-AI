import {Flame, Palmtree, Sandwich, Ticket, X} from 'lucide-react';
import type {ReactNode} from 'react';
import type {CalorieStreakSnapshot} from './loggingStreak.ts';

function StreakSwitch({
  checked,
  ariaLabel,
  onChange,
}: {
  checked: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-text-light)]/25'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
          checked ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
        }`}
        aria-hidden
      />
    </button>
  );
}

function ModeToggleRow({
  icon,
  title,
  checked,
  ariaLabel,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  checked: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[var(--color-accent)]">{icon}</span>
        <p className="text-sm font-medium text-fg">{title}</p>
      </div>
      <StreakSwitch checked={checked} ariaLabel={ariaLabel} onChange={onChange} />
    </div>
  );
}

function CheatDayTickets({
  total,
  used,
  todayActive,
  onSpendToday,
  onRefundToday,
}: {
  total: number;
  used: number;
  todayActive: boolean;
  onSpendToday: () => void;
  onRefundToday: () => void;
}) {
  if (total <= 0) return null;

  const remaining = Math.max(0, total - used);

  return (
    <div className="rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-light)]">
          Cheat days
        </p>
        <p className="text-xs tabular-nums text-[var(--color-text-light)]">
          {remaining} left this week
        </p>
      </div>
      <div className="flex justify-center gap-4">
        {Array.from({length: total}, (_, i) => {
          const spent = i < used;
          const isToday = todayActive && spent && i === used - 1;
          const canSpend = !todayActive && !spent && remaining > 0;

          return (
            <button
              key={i}
              type="button"
              disabled={!spent && !canSpend}
              onClick={() => {
                if (isToday) onRefundToday();
                else if (canSpend) onSpendToday();
              }}
              aria-label={
                isToday
                  ? 'Remove cheat day for today'
                  : spent
                    ? 'Cheat day used this week'
                    : canSpend
                      ? 'Use cheat day for today'
                      : 'No cheat days available'
              }
              className={`group flex flex-col items-center gap-1.5 disabled:cursor-default ${
                spent ? 'opacity-45' : ''
              }`}
            >
              <span
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] transition ${
                  spent
                    ? isToday
                      ? 'border-fg/45 bg-[var(--color-surface)]'
                      : 'border-[var(--color-text-light)]/25 bg-[var(--color-surface)]/50'
                    : canSpend
                      ? 'border-[var(--color-text-light)]/35 bg-[var(--color-surface)] group-hover:border-fg/45 group-hover:bg-[var(--color-panel-hover)]'
                      : 'border-[var(--color-text-light)]/15 bg-transparent'
                }`}
              >
                <Ticket
                  className={`h-6 w-6 ${
                    spent
                      ? 'text-[var(--color-text-light)]/50'
                      : canSpend
                        ? 'text-fg'
                        : 'text-[var(--color-text-light)]/40'
                  }`}
                  aria-hidden
                />
                {spent ? (
                  <X
                    className="absolute h-7 w-7 text-[var(--color-text-light)]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                ) : null}
              </span>
              {isToday ? (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-fg">
                  Today
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StreakModal({
  open,
  snapshot,
  fastingToday,
  vacationMode,
  onClose,
  onSetFasting,
  onSetVacation,
  onSpendCheatCredit,
  onRefundCheatCredit,
}: {
  open: boolean;
  snapshot: CalorieStreakSnapshot;
  fastingToday: boolean;
  vacationMode: boolean;
  onClose: () => void;
  onSetFasting: (enabled: boolean) => void;
  onSetVacation: (enabled: boolean) => void;
  onSpendCheatCredit: () => void;
  onRefundCheatCredit: () => void;
}) {
  if (!open) return null;

  const {
    streakDays,
    todayCalories,
    calorieGoal,
    cheatDaysUsedThisWeek,
    cheatDaysPerWeek,
    cheatDayToday,
    todayAtRisk,
    includesToday,
  } = snapshot;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="glass max-h-[min(92vh,40rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-accent)]/10 p-5 shadow-lg accent-glow sm:p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-title"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
              <Flame className="h-5 w-5" aria-hidden />
            </span>
            <h2 id="streak-title" className="text-lg font-semibold text-fg brand-font">
              Streak
            </h2>
          </div>
          <button
            type="button"
            className="rounded-full p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-5 text-center">
          <p className="text-4xl font-bold tabular-nums text-[var(--color-accent)] brand-font">
            {streakDays}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-light)]">
            {streakDays === 1 ? 'day in a row' : 'days in a row'}
          </p>
          {calorieGoal > 0 ? (
            <p className="mt-3 text-xs tabular-nums text-[var(--color-text-light)]">
              Today: {Math.round(todayCalories)} / {calorieGoal} kcal
              {includesToday ? ' · goal met' : todayAtRisk ? ' · goal not met yet' : ''}
            </p>
          ) : null}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <ModeToggleRow
            icon={<Sandwich className="h-4 w-4" aria-hidden />}
            title="Fasting"
            checked={fastingToday}
            ariaLabel="Fasting today"
            onChange={onSetFasting}
          />
          <ModeToggleRow
            icon={<Palmtree className="h-4 w-4" aria-hidden />}
            title="Vacation"
            checked={vacationMode}
            ariaLabel="Vacation mode"
            onChange={onSetVacation}
          />
        </div>

        <CheatDayTickets
          total={cheatDaysPerWeek}
          used={cheatDaysUsedThisWeek}
          todayActive={cheatDayToday}
          onSpendToday={onSpendCheatCredit}
          onRefundToday={onRefundCheatCredit}
        />
      </div>
    </div>
  );
}

/** @deprecated Use StreakModal */
export const CalorieStreakModal = StreakModal;
export const LoggingStreakModal = StreakModal;
