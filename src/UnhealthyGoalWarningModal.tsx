import {AlertTriangle} from 'lucide-react';

export function UnhealthyGoalWarningModal({
  concerns,
  onConfirm,
  onCancel,
}: {
  concerns: string[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[106] flex items-center justify-center bg-black/80 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-health-title"
      onClick={onCancel}
    >
      <div
        className="glass flex w-full max-w-lg flex-col rounded-2xl border border-amber-500/25 shadow-xl accent-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-[var(--color-accent)]/10 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="goal-health-title" className="text-lg font-semibold text-fg brand-font">
              Goals may be unhealthy
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-light)]">
              These targets could be too aggressive. Consider adjusting them or talking with a
              healthcare professional.
            </p>
          </div>
        </div>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-[var(--color-text-light)]">
          {concerns.map((concern) => (
            <li key={concern} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
              <span>{concern}</span>
            </li>
          ))}
        </ul>
        <div className="flex shrink-0 gap-2 border-t border-[var(--color-accent)]/10 p-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-surface)] py-3 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)]"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-[var(--color-accent)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
          >
            Use anyway
          </button>
        </div>
      </div>
    </div>
  );
}
