import {useEffect, useState} from 'react';
import toast from 'react-hot-toast';
import {useSocial} from './SocialContext.tsx';

export function ProfileNameField() {
  const {enabled, profile, profileLoading, saveDisplayName} = useSocial();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.displayName) setName(profile.displayName);
  }, [profile?.displayName]);

  if (!enabled) {
    return (
      <p className="text-xs text-[#9ca3af]">
        Sign in with Google or email to set a profile name shared with Workout Tracker.
      </p>
    );
  }

  if (profileLoading && !profile) {
    return <p className="text-xs text-[#9ca3af]">Loading profile…</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-fg">Profile name</p>
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={32}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name"
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
        />
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await saveDisplayName(name);
              toast.success('Profile name saved');
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Could not save');
            } finally {
              setBusy(false);
            }
          }}
          className="shrink-0 rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-[var(--color-panel-hover)] disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
