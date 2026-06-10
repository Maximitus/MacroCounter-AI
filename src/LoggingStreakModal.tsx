import {Flame, Palmtree, Sandwich, UtensilsCrossed, X} from 'lucide-react';
import type {ReactNode} from 'react';
import type {LoggingStreakSnapshot} from './loggingStreak.ts';

function StreakSwitch({
  checked,
  disabled,
  ariaLabel,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${
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

function StreakToggleColumn({
  icon,
  title,
  checked,
  disabled,
  ariaLabel,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  checked: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] px-2 py-3">
      <span className="text-[var(--color-accent)]">{icon}</span>
      <p className="w-full text-center text-xs font-medium leading-tight text-fg">{title}</p>
      <StreakSwitch
        checked={checked}
        disabled={disabled}
        ariaLabel={ariaLabel}
        onChange={onChange}
      />
    </div>
  );
}

export function LoggingStreakModal({
  open,
  snapshot,
  onClose,
  onSetFasting,
  onSetVacation,
  onSetCheatDay,
}: {
  open: boolean;
  snapshot: LoggingStreakSnapshot;
  onClose: () => void;
  onSetFasting: (enabled: boolean) => void;
  onSetVacation: (enabled: boolean) => void;
  onSetCheatDay: (enabled: boolean) => void;
}) {
  if (!open) return null;

  const {
    streakDays,
    mealsLoggedToday,
    cheatDaysPerWeek,
    canUseCheatDayToday,
    fastingToday,
    cheatDayToday,
    vacationMode,
  } = snapshot;

  const cheatDisabled =
    cheatDaysPerWeek === 0 ||
    mealsLoggedToday > 0 ||
    (!cheatDayToday && !canUseCheatDayToday);

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
        aria-labelledby="logging-streak-title"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
              <Flame className="h-5 w-5" aria-hidden />
            </span>
            <h2 id="logging-streak-title" className="text-lg font-semibold text-fg brand-font">
              Logging streak
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

        <div className="mb-6 rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-5 text-center">
          <p className="text-4xl font-bold tabular-nums text-[var(--color-accent)] brand-font">
            {streakDays}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-light)]">
            {streakDays === 1 ? 'day in a row' : 'days in a row'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StreakToggleColumn
            icon={<Sandwich className="h-4 w-4" aria-hidden />}
            title="Fasting"
            checked={fastingToday}
            ariaLabel="Fasting today"
            onChange={onSetFasting}
          />
          <StreakToggleColumn
            icon={<Palmtree className="h-4 w-4" aria-hidden />}
            title="Vacation"
            checked={vacationMode}
            ariaLabel="Vacation mode"
            onChange={onSetVacation}
          />
          <StreakToggleColumn
            icon={<UtensilsCrossed className="h-4 w-4" aria-hidden />}
            title="Cheat day"
            checked={cheatDayToday}
            disabled={cheatDisabled}
            ariaLabel="Cheat day today"
            onChange={onSetCheatDay}
          />
        </div>
      </div>
    </div>
  );
}
