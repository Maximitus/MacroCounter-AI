import {useEffect, useState} from 'react';

export function ProfileUnitSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: {value: T; label: string}[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const currentLabel = options.find((option) => option.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="shrink-0 self-center px-1 py-0.5 text-sm font-medium text-[var(--color-text-light)] transition hover:text-fg"
      >
        {currentLabel}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className="glass min-w-[8.5rem] rounded-xl border border-[var(--color-accent)]/15 p-1.5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${
                  value === option.value
                    ? 'bg-[var(--color-accent)]/15 text-fg'
                    : 'text-[var(--color-text-light)] hover:bg-[var(--color-panel-hover)] hover:text-fg'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
