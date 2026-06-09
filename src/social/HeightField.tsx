import {ProfileUnitSelect} from './ProfileUnitSelect.tsx';
import type {ProfileHeightUnit} from './socialTypes.ts';
import {useSocial} from './SocialContext.tsx';
import {useProfileSettings} from './ProfileSettingsContext.tsx';

const HEIGHT_UNIT_OPTIONS: {value: ProfileHeightUnit; label: string}[] = [
  {value: 'ft_in', label: 'ft/in'},
  {value: 'cm', label: 'cm'},
];

export function HeightField() {
  const {enabled, profileLoading} = useSocial();
  const {
    feet,
    setFeet,
    inches,
    setInches,
    cmDraft,
    setCmDraft,
    heightUnit,
    setHeightUnit,
  } = useProfileSettings();

  if (!enabled) return null;
  if (profileLoading && !feet && !inches && !cmDraft) {
    return <p className="text-xs text-[#9ca3af]">Loading profile…</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-fg">Height</p>
      <div className="flex flex-wrap gap-2">
        {heightUnit === 'ft_in' ? (
          <>
            <input
              type="number"
              min={0}
              max={8}
              step={1}
              inputMode="numeric"
              value={feet}
              onChange={(e) => setFeet(e.target.value)}
              placeholder="ft"
              aria-label="Height feet"
              className="w-16 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
            />
            <input
              type="number"
              min={0}
              max={11}
              step={1}
              inputMode="numeric"
              value={inches}
              onChange={(e) => setInches(e.target.value)}
              placeholder="in"
              aria-label="Height inches"
              className="w-16 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
            />
          </>
        ) : (
          <input
            type="number"
            min={0}
            step={1}
            inputMode="decimal"
            value={cmDraft}
            onChange={(e) => setCmDraft(e.target.value)}
            placeholder="e.g. 178"
            aria-label="Height centimeters"
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
          />
        )}
        <ProfileUnitSelect
          value={heightUnit}
          options={HEIGHT_UNIT_OPTIONS}
          ariaLabel="Height unit"
          onChange={setHeightUnit}
        />
      </div>
    </div>
  );
}
