/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sister apps navigation — see docs/ui-specs/SISTER_APPS_UI_SPEC.md
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type SisterAppId = 'workout' | 'macrocounter' | 'formanalyzer';

const SISTER_APPS: { id: SisterAppId; label: string; href: string }[] = [
  { id: 'workout', label: 'Workout', href: 'https://maxmvs.com/workout' },
  { id: 'macrocounter', label: 'Macro Counter', href: 'https://maxmvs.com/macrocounter' },
  { id: 'formanalyzer', label: 'Form Analyzer', href: 'https://maxmvs.com/formanalyzer' },
];

type SisterAppsTitleMenuProps = {
  /** App shown in the header; excluded from the dropdown. */
  currentApp: SisterAppId;
};

export function SisterAppsTitleMenu({ currentApp }: SisterAppsTitleMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerId = 'sister-apps-trigger';
  const menuId = 'sister-apps-menu';

  const others = SISTER_APPS.filter((a) => a.id !== currentApp);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const currentLabel = SISTER_APPS.find((a) => a.id === currentApp)?.label ?? 'App';

  return (
    <div ref={containerRef} className="relative min-w-0">
      <h1 className="m-0 min-w-0 text-2xl font-semibold leading-tight tracking-tight brand-font">
        <button
          type="button"
          id={triggerId}
          className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-lg py-0.5 pl-0 pr-1 text-left text-[var(--color-accent)] transition hover:bg-[var(--color-surface)]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-chrome-bar)]"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="min-w-0 truncate">{currentLabel}</span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-[var(--color-accent)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </h1>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className="absolute left-0 top-full z-50 mt-1 min-w-[14rem] rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-chrome-bar)] py-1 shadow-lg"
        >
          {others.map((app) => (
            <a
              key={app.id}
              role="menuitem"
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2.5 text-sm text-fg no-underline transition hover:bg-[var(--color-surface)]"
              onClick={() => setOpen(false)}
            >
              {app.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
