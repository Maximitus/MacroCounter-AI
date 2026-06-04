import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import {useAuth} from '../auth/AuthContext.tsx';
import {isFirebaseConfigured} from '../firebase.ts';
import {friendInviteUrl, normalizeFriendCode} from './friendCode.ts';
import {
  addFriendByUid,
  ensureUserProfile,
  fetchUserDisplayName,
  resolveFriendCode,
  subscribeFriends,
  subscribeMacroSocial,
  subscribeUserProfile,
  updateDisplayName,
} from './socialRepository.ts';
import type {FriendEntry, FriendWithStreak, MacroSocialPresence, UserProfile} from './socialTypes.ts';

type SocialContextValue = {
  enabled: boolean;
  profile: UserProfile | null;
  profileLoading: boolean;
  friends: FriendWithStreak[];
  saveDisplayName: (name: string) => Promise<void>;
  addFriendByCode: (code: string) => Promise<void>;
  inviteUrl: string;
};

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({children}: {children: ReactNode}) {
  const {user, loading: authLoading} = useAuth();
  const enabled = isFirebaseConfigured() && !!user && !user.isAnonymous;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [streakByUid, setStreakByUid] = useState<Record<string, MacroSocialPresence | null>>({});
  const streakUnsubs = useRef<Map<string, () => void>>(new Map());

  const addFriendByCode = useCallback(
    async (code: string) => {
      if (!user || !profile) throw new Error('Sign in to add friends');
      const friendUid = await resolveFriendCode(code);
      if (!friendUid) throw new Error('Friend code not found');
      if (friendUid === user.uid) throw new Error('That is your own code');
      if (friends.some((f) => f.uid === friendUid)) {
        toast('Already friends');
        return;
      }

      const friendName = await fetchUserDisplayName(friendUid);
      await addFriendByUid(user.uid, friendUid, friendName);
      await addFriendByUid(friendUid, user.uid, profile.displayName);
      toast.success(`Added ${friendName}`);
    },
    [user, profile, friends],
  );

  useEffect(() => {
    if (!enabled || !user) {
      setProfile(null);
      setFriends([]);
      setStreakByUid({});
      setProfileLoading(false);
      streakUnsubs.current.forEach((u) => u());
      streakUnsubs.current.clear();
      return;
    }

    setProfileLoading(true);
    void ensureUserProfile(user.uid, user.email)
      .then(setProfile)
      .catch((e) => {
        console.error(e);
        toast.error('Could not load profile');
      })
      .finally(() => setProfileLoading(false));

    const unsubProfile = subscribeUserProfile(user.uid, (p) => {
      if (p) setProfile(p);
    });

    const unsubFriends = subscribeFriends(user.uid, setFriends, (e) => {
      console.error(e);
      toast.error('Could not load friends');
    });

    return () => {
      unsubProfile();
      unsubFriends();
    };
  }, [enabled, user?.uid, user?.email]);

  useEffect(() => {
    if (!enabled) return;

    const needed = new Set(friends.map((f) => f.uid));
    for (const [uid, unsub] of streakUnsubs.current) {
      if (!needed.has(uid)) {
        unsub();
        streakUnsubs.current.delete(uid);
        setStreakByUid((prev) => {
          const next = {...prev};
          delete next[uid];
          return next;
        });
      }
    }

    for (const friend of friends) {
      if (streakUnsubs.current.has(friend.uid)) continue;
      const unsub = subscribeMacroSocial(
        friend.uid,
        (data) => setStreakByUid((prev) => ({...prev, [friend.uid]: data})),
        (e) => console.error(e),
      );
      streakUnsubs.current.set(friend.uid, unsub);
    }
  }, [enabled, friends]);

  useEffect(() => {
    return () => {
      streakUnsubs.current.forEach((u) => u());
      streakUnsubs.current.clear();
    };
  }, []);

  const saveDisplayName = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Sign in first');
      await updateDisplayName(user.uid, name);
    },
    [user],
  );

  const friendsWithStreak: FriendWithStreak[] = useMemo(
    () =>
      friends.map((f) => ({
        ...f,
        macroSocial: streakByUid[f.uid] ?? null,
      })),
    [friends, streakByUid],
  );

  const inviteUrl = profile?.friendCode ? friendInviteUrl(profile.friendCode) : '';

  const value = useMemo<SocialContextValue>(
    () => ({
      enabled,
      profile,
      profileLoading,
      friends: friendsWithStreak,
      saveDisplayName,
      addFriendByCode,
      inviteUrl,
    }),
    [
      enabled,
      profile,
      profileLoading,
      friendsWithStreak,
      saveDisplayName,
      addFriendByCode,
      inviteUrl,
    ],
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial(): SocialContextValue {
  const ctx = useContext(SocialContext);
  if (!ctx) {
    throw new Error('useSocial must be used within SocialProvider');
  }
  return ctx;
}
