import type {ReactNode} from 'react';
import {SubAppHeader} from './SubAppHeader.tsx';

export function AppPageShell({
  title,
  subtitle,
  children,
  backTo = '/',
  backLabel = 'Back',
  onBack,
  headerRight,
  bare = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
  headerRight?: ReactNode;
  bare?: boolean;
}) {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-[var(--color-bg-dark)] font-sans text-fg blueprint-bg">
      <SubAppHeader
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        backTo={onBack ? undefined : backTo}
        backLabel={backLabel}
        headerRight={headerRight}
      />
      <main className="grid min-w-0 max-w-full gap-6 px-4 pt-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:px-8 md:pt-5">
        {bare ? (
          children
        ) : (
          <section className="glass rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow">
            {children}
          </section>
        )}
      </main>
    </div>
  );
}
