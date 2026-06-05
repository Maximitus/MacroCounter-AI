import {FriendsList} from './FriendsList.tsx';
import {useSocial} from './SocialContext.tsx';

export function SocialOverviewSection({onOpenSocial}: {onOpenSocial: () => void}) {
  const {enabled, profile} = useSocial();

  if (!enabled) {
    return (
      <section className="glass rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow">
        <h2 className="mb-2 text-xl font-semibold text-fg brand-font">Friends & streaks</h2>
        <p className="text-sm text-[var(--color-text-light)]">
          Sign in with Google or email to see friends&apos; calorie streaks.
        </p>
      </section>
    );
  }

  return (
    <section className="glass rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-fg brand-font">Friends & streaks</h2>
        <button
          type="button"
          onClick={onOpenSocial}
          className="max-w-[10rem] truncate text-sm font-medium text-fg hover:underline"
          title={profile?.displayName ?? 'Open Social'}
        >
          {profile?.displayName ?? 'Social'}
        </button>
      </div>
      <FriendsList />
    </section>
  );
}
