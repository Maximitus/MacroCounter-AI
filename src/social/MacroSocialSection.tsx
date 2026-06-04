import {useState} from 'react';
import toast from 'react-hot-toast';
import {normalizeFriendCode} from './friendCode.ts';
import {useSocial} from './SocialContext.tsx';

function streakLabel(above: number, below: number): string {
  const parts: string[] = [];
  if (above > 0) parts.push(`${above} day${above === 1 ? '' : 's'} above calorie goal`);
  if (below > 0) parts.push(`${below} day${below === 1 ? '' : 's'} below calorie goal`);
  if (parts.length === 0) return 'No active calorie streak';
  return parts.join(' · ');
}

export function MacroSocialSection() {
  const {enabled, profile, friends, addFriendByCode, inviteUrl} = useSocial();
  const [friendCode, setFriendCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <p className="text-xs text-[#9ca3af]">
        Sign in with Google or email to add friends and share your calorie streak.
      </p>
    );
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/40 px-3 py-2.5">
      <p className="text-sm font-medium text-fg">Friends</p>
      <p className="text-[11px] leading-snug text-[#9ca3af]">
        Friends see your calorie streak (above/below daily goal).
      </p>

      {profile?.friendCode ? (
        <p className="text-xs text-[#9ca3af]">
          Your code:{' '}
          <span className="font-mono text-fg">{profile.friendCode}</span>
          {inviteUrl ? (
            <>
              {' '}
              ·{' '}
              <button
                type="button"
                className="text-[var(--color-accent)] underline-offset-2 hover:underline"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteUrl);
                  toast.success('Invite link copied');
                }}
              >
                Copy invite link
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          value={friendCode}
          onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
          placeholder="Friend code"
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-sm tracking-wider text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
        />
        <button
          type="button"
          disabled={busy || normalizeFriendCode(friendCode).length < 6}
          onClick={async () => {
            setBusy(true);
            try {
              await addFriendByCode(friendCode);
              setFriendCode('');
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Could not add friend');
            } finally {
              setBusy(false);
            }
          }}
          className="shrink-0 rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-95 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {friends.length === 0 ? (
        <p className="text-xs text-[#9ca3af]">No friends yet. Add someone from Workout or Macro.</p>
      ) : (
        <ul className="space-y-2">
          {friends.map((f) => {
            const above = f.macroSocial?.streakAboveDays ?? 0;
            const below = f.macroSocial?.streakBelowDays ?? 0;
            return (
              <li
                key={f.uid}
                className="rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/50 px-3 py-2"
              >
                <p className="text-sm font-medium text-fg">{f.displayName}</p>
                <p className="text-xs text-[#9ca3af]">{streakLabel(above, below)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
