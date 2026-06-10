import {useState} from 'react';
import {CircleHelp} from 'lucide-react';
import type {ProfileBodyType} from './socialTypes.ts';
import {useSocial} from './SocialContext.tsx';
import {useProfileSettings} from './ProfileSettingsContext.tsx';
import {SomatotypeQuizModal} from './SomatotypeQuizModal.tsx';

const OPTIONS: {value: ProfileBodyType; label: string}[] = [
  {value: 'ectomorph', label: 'Ectomorph'},
  {value: 'mesomorph', label: 'Mesomorph'},
  {value: 'endomorph', label: 'Endomorph'},
];

export function BodyTypeField() {
  const {enabled, profileLoading} = useSocial();
  const {bodyType, setBodyType} = useProfileSettings();
  const [quizOpen, setQuizOpen] = useState(false);

  if (!enabled) return null;

  if (profileLoading && bodyType === undefined) {
    return <p className="text-xs text-[#9ca3af]">Loading profile…</p>;
  }

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-fg">Somatotype</p>
          <button
            type="button"
            aria-label="Help me choose my somatotype"
            onClick={() => setQuizOpen(true)}
            className="rounded-full p-1 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {OPTIONS.map((option) => {
            const selected = bodyType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setBodyType(option.value)}
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
      <SomatotypeQuizModal
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        onSelect={setBodyType}
      />
    </>
  );
}
