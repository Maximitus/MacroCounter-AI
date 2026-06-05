import {UserMinus} from 'lucide-react';
import {FriendStreakRow} from './FriendStreakRow.tsx';
import {useSocial} from './SocialContext.tsx';

export function FriendsList() {
  const {friends, removeFriend} = useSocial();

  if (friends.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-light)]">
        No friends yet. Add someone from Workout or Macro with a friend code.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {friends.map((friend) => (
        <li
          key={friend.uid}
          className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)] px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <FriendStreakRow friend={friend} />
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-panel-hover)] hover:text-red-300"
            aria-label={`Remove ${friend.displayName}`}
            title="Remove friend"
            onClick={() => {
              void removeFriend(friend.uid).catch((e) => {
                console.error(e);
              });
            }}
          >
            <UserMinus className="h-4 w-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
