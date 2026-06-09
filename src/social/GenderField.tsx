import type {ProfileGender} from './socialTypes.ts';
import {useSocial} from './SocialContext.tsx';
import {useProfileSettings} from './ProfileSettingsContext.tsx';

const OPTIONS: {value: ProfileGender; label: string}[] = [
  {value: 'female', label: 'Female'},
  {value: 'male', label: 'Male'},
  {value: 'prefer_not_to_say', label: 'Prefer not to say'},
];

export function GenderField() {
  const {enabled, profileLoading} = useSocial();
  const {gender, setGender} = useProfileSettings();

  if (!enabled) return null;

  if (profileLoading && gender === undefined) {
    return <p className="text-xs text-[#9ca3af]">Loading profile…</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-fg">Gender</p>
      <div className="grid grid-cols-3 gap-1.5">
        {OPTIONS.map((option) => {
          const selected = gender === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setGender(option.value)}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                selected
                  ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-fg'
                  : 'border-[var(--color-accent)]/20 bg-[var(--color-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-panel-hover)] hover:text-fg'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
