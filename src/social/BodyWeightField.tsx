import {ProfileUnitSelect} from './ProfileUnitSelect.tsx';
import type {ProfileWeightUnit} from './socialTypes.ts';
import {useSocial} from './SocialContext.tsx';
import {useProfileSettings} from './ProfileSettingsContext.tsx';

const WEIGHT_UNIT_OPTIONS: {value: ProfileWeightUnit; label: string}[] = [
  {value: 'lb', label: 'lb'},
  {value: 'kg', label: 'kg'},
];

export function BodyWeightField() {
  const {enabled, profileLoading} = useSocial();
  const {weightDraft, setWeightDraft, weightUnit, setWeightUnit} = useProfileSettings();

  if (!enabled) return null;
  if (profileLoading && !weightDraft) {
    return <p className="text-xs text-[#9ca3af]">Loading profile…</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-fg">Weight</p>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          step={0.1}
          inputMode="decimal"
          value={weightDraft}
          onChange={(e) => setWeightDraft(e.target.value)}
          placeholder={weightUnit === 'lb' ? 'e.g. 175.4' : 'e.g. 79.5'}
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
        />
        <ProfileUnitSelect
          value={weightUnit}
          options={WEIGHT_UNIT_OPTIONS}
          ariaLabel="Weight unit"
          onChange={setWeightUnit}
        />
      </div>
    </div>
  );
}
