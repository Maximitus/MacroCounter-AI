import {useSocial} from './SocialContext.tsx';
import {useProfileSettings} from './ProfileSettingsContext.tsx';

export function ProfileNameField() {
  const {enabled, profileLoading} = useSocial();
  const {displayName, setDisplayName} = useProfileSettings();

  if (!enabled) {
    return (
      <p className="text-xs text-[#9ca3af]">
        Sign in with Google or email to set a profile name shared with Workout Tracker.
      </p>
    );
  }

  if (profileLoading && !displayName) {
    return <p className="text-xs text-[#9ca3af]">Loading profile…</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-fg">Profile name</p>
      <input
        type="text"
        maxLength={32}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name"
        className="w-full rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
      />
    </div>
  );
}
