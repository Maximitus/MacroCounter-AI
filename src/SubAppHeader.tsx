import {Link} from 'react-router-dom';
import {ArrowLeft, X} from 'lucide-react';
import type {ReactNode} from 'react';

export function SubAppHeader({
  title,
  subtitle,
  onBack,
  backTo,
  backLabel = 'Back',
  backIcon = 'arrow',
  headerRight,
  flush = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backTo?: string;
  backLabel?: string;
  backIcon?: 'arrow' | 'close';
  headerRight?: ReactNode;
  flush?: boolean;
}) {
  const backClassName =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg transition hover:bg-[var(--color-surface)]';
  const backContent =
    backIcon === 'close' ? (
      <X className="h-5 w-5" aria-hidden />
    ) : (
      <ArrowLeft className="h-6 w-6" aria-hidden />
    );

  return (
    <header
      className={`flex shrink-0 items-center gap-2 border-b border-[var(--color-accent)]/20 bg-[var(--color-chrome-bar)] px-2 py-2.5 shadow-md md:px-4 ${flush ? 'mb-0' : 'mb-5'}`}
    >
      {onBack ? (
        <button type="button" onClick={onBack} className={backClassName} aria-label={backLabel}>
          {backContent}
        </button>
      ) : (
        <Link to={backTo ?? '/'} className={backClassName} aria-label={backLabel}>
          {backContent}
        </Link>
      )}
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-xl font-semibold leading-tight tracking-tight text-fg brand-font sm:text-2xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate text-[11px] text-[var(--color-text-light)]">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex h-11 min-w-11 shrink-0 items-center justify-end gap-0.5">
        {headerRight}
      </div>
    </header>
  );
}
