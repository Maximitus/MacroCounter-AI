const selectClass =
  'rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-2 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45';

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
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as T)}
      className={selectClass}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
