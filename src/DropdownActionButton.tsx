import type {ReactNode} from 'react';

/** Footer row under expanded dropdown previews. */
export const dropdownActionFooterClass =
  'flex flex-wrap items-center justify-center gap-2 pt-2';

export type LabeledActionVariant = 'primary' | 'live' | 'secondary';

const labeledActionShellClass =
  'inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-bg-dark)] px-3 text-sm font-semibold text-fg transition hover:bg-[var(--color-panel-hover)] disabled:cursor-not-allowed disabled:opacity-45';

const labeledActionIconClass: Record<LabeledActionVariant, string> = {
  primary: 'text-[var(--color-accent)]',
  live: 'text-emerald-400',
  secondary: 'text-[var(--color-text-light)]',
};

/** Primary footer CTA — dark pill with colored icon + label. */
export function LabeledActionButton({
  icon,
  label,
  onClick,
  disabled,
  title,
  variant = 'primary',
  className = '',
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  variant?: LabeledActionVariant;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      className={`${labeledActionShellClass} ${className}`.trim()}
    >
      <span className={`inline-flex shrink-0 ${labeledActionIconClass[variant]}`}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
