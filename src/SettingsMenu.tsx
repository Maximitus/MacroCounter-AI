/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Moon, Settings, Sun } from 'lucide-react';
import { ACCENT_PRESETS, getAccentPreset, useTheme } from './theme.tsx';

export function SettingsMenu() {
  const { theme, setTheme, accentId, setAccentId } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="settings-cog-trigger inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-dark)]"
        aria-label="Open settings"
        title="Settings"
      >
        <Settings className="settings-cog h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.85} aria-hidden />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="glass relative w-full max-w-md rounded-2xl border border-[var(--color-accent)]/15 p-6 shadow-lg accent-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="settings-title" className="mb-6 text-lg font-semibold text-fg brand-font">
              Settings
            </h2>

            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-medium text-[var(--color-text-light)]">Theme</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition ${
                      theme === 'dark'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-panel-hover)]'
                    }`}
                  >
                    <Moon className="h-4 w-4" aria-hidden />
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition ${
                      theme === 'light'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-panel-hover)]'
                    }`}
                  >
                    <Sun className="h-4 w-4" aria-hidden />
                    Light
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-[var(--color-text-light)]">Accent color</p>
                <div className="flex flex-wrap gap-3">
                  {ACCENT_PRESETS.map((preset) => {
                    const swatch = theme === 'light' ? preset.lightAccent : preset.darkAccent;
                    const selected = accentId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAccentId(preset.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg p-1 transition ${
                          selected
                            ? 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg-dark)]'
                            : 'opacity-90 hover:opacity-100'
                        }`}
                        title={preset.label}
                        aria-label={`Accent ${preset.label}`}
                        aria-pressed={selected}
                      >
                        <span
                          className="h-10 w-10 rounded-full border border-[var(--color-accent)]/20 shadow-inner"
                          style={{ backgroundColor: swatch }}
                        />
                        <span className="max-w-[4.5rem] truncate text-center text-xs text-[var(--color-text-light)]">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-[var(--color-text-light)]/80">
                  Current: {getAccentPreset(accentId).label}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="mt-8 w-full rounded-full bg-[var(--color-surface)] py-3 text-sm font-medium text-[var(--color-text-light)] transition hover:bg-[var(--color-panel-hover)]"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
