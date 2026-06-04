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
    <div className="space-y-2 border-t border-[var(--color-accent)]/10 pt-4">
      <p className="text-sm font-medium text-fg">Profile name</p>
      <p className="text-xs text-[#9ca3af]">
        Friends see this on Macro Counter and Workout (same account).
      </p>
      <input
        type="text"
        maxLength={32}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your display name"
        className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-3 py-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
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
        className="w-full rounded-full bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)] disabled:opacity-50"
      >
        Save profile name
      </button>
    </div>
  );
}
