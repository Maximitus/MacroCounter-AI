import {useEffect, useState} from 'react';
import {ChevronDown, Moon, Sun, X} from 'lucide-react';
import {AccountSection} from './auth/AccountSection.tsx';
import {TermsOfUseContent} from './TermsOfUseContent.tsx';
import {ACCENT_PRESETS, useTheme} from './theme.tsx';

export function SettingsModal({
  open,
  onClose,
  initialTermsOpen = false,
  showWeightSection,
  onShowWeightSectionChange,
}: {
  open: boolean;
  onClose: () => void;
  initialTermsOpen?: boolean;
  showWeightSection: boolean;
  onShowWeightSectionChange: (v: boolean) => void;
}) {
  const {theme, setTheme, accentId, setAccentId} = useTheme();
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialTermsOpen) setTermsOpen(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, initialTermsOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative flex max-h-[min(92dvh,40rem)] w-full max-w-md flex-col rounded-[1.25rem] border p-4 shadow-lg accent-glow sm:p-5 ${
          theme === 'dark'
            ? 'border-[var(--color-accent)]/20 bg-[#2c3338]'
            : 'glass border-[var(--color-accent)]/15'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-accent)]/10 pb-3">
          <h2 id="settings-title" className="text-lg font-semibold text-fg brand-font">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain pr-0.5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-fg">Account</h3>
            <AccountSection />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-fg">App</h3>
            <div className="space-y-4">
              <div className="inline-flex rounded-full bg-[var(--color-surface)] p-0.5">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    theme === 'dark'
                      ? 'bg-[var(--color-accent)] text-white shadow-sm'
                      : 'text-[var(--color-text-light)]'
                  }`}
                >
                  <Moon className="h-3 w-3 shrink-0" aria-hidden />
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    theme === 'light'
                      ? 'bg-[var(--color-accent)] text-white shadow-sm'
                      : 'text-[var(--color-text-light)]'
                  }`}
                >
                  <Sun className="h-3 w-3 shrink-0" aria-hidden />
                  Light
                </button>
              </div>

              <div>
                <p className="mb-2 text-xs text-[#9ca3af]">Accent color</p>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_PRESETS.map((preset) => {
                    const swatch = theme === 'light' ? preset.lightAccent : preset.darkAccent;
                    const selected = accentId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAccentId(preset.id)}
                        className={`flex min-w-[3.5rem] flex-col items-center gap-1 rounded-lg px-1.5 py-1 transition ${
                          selected
                            ? 'border-2 border-[var(--color-accent)]'
                            : 'border-2 border-transparent hover:opacity-95'
                        }`}
                        title={preset.label}
                        aria-label={`Accent ${preset.label}`}
                        aria-pressed={selected}
                      >
                        <span
                          className="h-8 w-8 shrink-0 rounded-full shadow-inner"
                          style={{backgroundColor: swatch}}
                        />
                        <span className="text-center text-[10px] leading-tight text-[#9ca3af]">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)] px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">Show weight section</p>
                    <p className="text-xs text-[var(--color-text-light)]">
                      Display the weight chart and log on the home screen
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showWeightSection}
                    aria-label="Show weight section on home screen"
                    onClick={() => onShowWeightSectionChange(!showWeightSection)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      showWeightSection
                        ? 'bg-[var(--color-accent)]'
                        : 'bg-[var(--color-text-light)]/25'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                        showWeightSection ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
                      }`}
                      aria-hidden
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-fg">Legal</h3>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-3 py-2.5 text-left text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)]"
              aria-expanded={termsOpen}
              onClick={() => setTermsOpen((v) => !v)}
            >
              <span>Terms of use</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[var(--color-text-light)] transition-transform duration-200 ${termsOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {termsOpen ? (
              <div className="scrollbar-hidden mt-3 max-h-[min(40vh,18rem)] overflow-y-auto overscroll-y-contain rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-bg-dark)] p-4">
                <TermsOfUseContent compact />
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className={`mt-3 w-full shrink-0 rounded-full py-2.5 text-sm font-medium transition ${
            theme === 'dark'
              ? 'bg-[var(--color-surface)] text-white hover:bg-[var(--color-panel-hover)]'
              : 'bg-[var(--color-surface)] text-fg hover:bg-[var(--color-panel-hover)]'
          }`}
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}
