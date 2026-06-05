import {AlertTriangle} from 'lucide-react';
import type {MacroDataBundle} from './macroTypes.ts';

export type MacroSyncConflictInfo = {
  local: MacroDataBundle;
  remote: MacroDataBundle;
  localUpdatedMs: number;
  remoteUpdatedMs: number;
};

export type MacroBundleSummary = {
  mealCount: number;
  favoriteCount: number;
  loggedDays: number;
  weightEntries: number;
  todayCalories: number;
  goalCalories: number;
  weightGoal: number;
};

export function summarizeMacroBundle(bundle: MacroDataBundle): MacroBundleSummary {
  return {
    mealCount: bundle.history.length,
    favoriteCount: bundle.favorites.length,
    loggedDays: Object.keys(bundle.dailyLog).length,
    weightEntries: Object.keys(bundle.weightLog).length,
    todayCalories: bundle.macros.calories,
    goalCalories: bundle.goals.calories,
    weightGoal: bundle.weightGoal,
  };
}

function formatSyncTime(ms: number): string {
  if (ms <= 0) return 'Unknown';
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function SummaryCard({
  title,
  updatedMs,
  summary,
  newer,
}: {
  title: string;
  updatedMs: number;
  summary: MacroBundleSummary;
  newer: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-fg">{title}</p>
        {newer ? (
          <span className="shrink-0 rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent)]">
            Newer
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-[#9ca3af]">Last updated {formatSyncTime(updatedMs)}</p>
      <ul className="mt-2 space-y-0.5 text-xs text-[var(--color-text-light)]">
        <li>
          {summary.mealCount} meal{summary.mealCount === 1 ? '' : 's'} logged today
        </li>
        <li>
          {summary.loggedDays} day{summary.loggedDays === 1 ? '' : 's'} in diary,{' '}
          {summary.favoriteCount} favorite{summary.favoriteCount === 1 ? '' : 's'}
        </li>
        <li>
          Today: {summary.todayCalories} / {summary.goalCalories} cal
        </li>
        {summary.weightGoal > 0 ? <li>Weight goal: {summary.weightGoal}</li> : null}
        {summary.weightEntries > 0 ? (
          <li>
            {summary.weightEntries} weight entr{summary.weightEntries === 1 ? 'y' : 'ies'}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function MacroSyncConflictModal({
  conflict,
  resolving,
  onChoose,
}: {
  conflict: MacroSyncConflictInfo;
  resolving: boolean;
  onChoose: (choice: 'local' | 'remote') => void;
}) {
  const localSummary = summarizeMacroBundle(conflict.local);
  const remoteSummary = summarizeMacroBundle(conflict.remote);
  const localNewer =
    conflict.localUpdatedMs > 0 &&
    conflict.remoteUpdatedMs > 0 &&
    conflict.localUpdatedMs > conflict.remoteUpdatedMs;
  const remoteNewer =
    conflict.localUpdatedMs > 0 &&
    conflict.remoteUpdatedMs > 0 &&
    conflict.remoteUpdatedMs > conflict.localUpdatedMs;

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="macro-sync-conflict-title"
      aria-describedby="macro-sync-conflict-body"
    >
      <div className="glass flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col rounded-2xl border border-[var(--color-accent)]/10 shadow-xl accent-glow">
        <div className="flex shrink-0 items-start gap-3 border-b border-[var(--color-accent)]/10 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="macro-sync-conflict-title" className="text-lg font-semibold text-fg brand-font">
              Macro data differs
            </h2>
            <p id="macro-sync-conflict-body" className="mt-1 text-sm text-[var(--color-text-light)]">
              Your account and this device have different saved macro data. Choose which copy to
              keep — the other will be replaced.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <SummaryCard
            title="Cloud (your account)"
            updatedMs={conflict.remoteUpdatedMs}
            summary={remoteSummary}
            newer={remoteNewer}
          />
          <SummaryCard
            title="This device"
            updatedMs={conflict.localUpdatedMs}
            summary={localSummary}
            newer={localNewer}
          />
        </div>

        <div className="shrink-0 border-t border-[var(--color-accent)]/10 p-5">
          <div className="flex flex-row gap-2.5">
            <button
              type="button"
              disabled={resolving}
              onClick={() => onChoose('remote')}
              className="min-w-0 flex-1 rounded-full bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white shadow-sm shadow-[var(--color-accent)]/20 transition-all duration-200 hover:-translate-y-px hover:bg-[var(--color-accent-hover)] hover:shadow-lg hover:shadow-[var(--color-accent)]/35 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-sm"
            >
              Keep cloud copy
            </button>
            <button
              type="button"
              disabled={resolving}
              onClick={() => onChoose('local')}
              className="min-w-0 flex-1 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg transition hover:border-[var(--color-accent)]/35 hover:bg-[var(--color-panel-hover)] active:scale-[0.98] disabled:opacity-50"
            >
              Keep this device
            </button>
          </div>
          {resolving ? (
            <p className="mt-2 text-center text-xs text-[#9ca3af]">Applying your choice…</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
