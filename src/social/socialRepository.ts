import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import {getFirebaseDb} from '../firebase.ts';
import {generateFriendCode, normalizeFriendCode} from './friendCode.ts';
import type {FriendEntry, MacroSocialPresence, UserProfile} from './socialTypes.ts';

function profileRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid, 'profile', 'main');
}

function macroSocialRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid, 'macroSocial', 'main');
}

function friendCodeRef(code: string) {
  return doc(getFirebaseDb(), 'friendCodes', normalizeFriendCode(code));
}

function friendsCol(uid: string) {
  return collection(getFirebaseDb(), 'users', uid, 'friends');
}

function friendRef(uid: string, friendUid: string) {
  return doc(getFirebaseDb(), 'users', uid, 'friends', friendUid);
}

function defaultDisplayName(email: string | null | undefined, uid: string): string {
  if (email) {
    const local = email.split('@')[0]?.trim();
    if (local) return local.slice(0, 24);
  }
  return `User ${uid.slice(0, 6)}`;
}

export async function ensureUserProfile(
  uid: string,
  email: string | null | undefined,
): Promise<UserProfile> {
  const ref = profileRef(uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return existing.data() as UserProfile;
  }

  let code = generateFriendCode();
  for (let attempt = 0; attempt < 12; attempt++) {
    const codeSnap = await getDoc(friendCodeRef(code));
    if (!codeSnap.exists()) {
      await setDoc(friendCodeRef(code), {uid});
      const profile: UserProfile = {
        displayName: defaultDisplayName(email, uid),
        friendCode: code,
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, profile);
      return profile;
    }
    code = generateFriendCode();
  }
  throw new Error('Could not create friend code');
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    profileRef(uid),
    (snap) => onData(snap.exists() ? (snap.data() as UserProfile) : null),
    (err) => onError?.(err as Error),
  );
}

export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  const trimmed = displayName.trim().slice(0, 32);
  if (!trimmed) throw new Error('Enter a profile name');
  await setDoc(
    profileRef(uid),
    {displayName: trimmed, updatedAt: serverTimestamp()},
    {merge: true},
  );
}

export async function fetchUserDisplayName(uid: string): Promise<string> {
  const snap = await getDoc(profileRef(uid));
  if (snap.exists() && typeof snap.data()?.displayName === 'string') {
    return snap.data()!.displayName as string;
  }
  return 'Friend';
}

export async function resolveFriendCode(code: string): Promise<string | null> {
  const normalized = normalizeFriendCode(code);
  if (normalized.length < 6) return null;
  const snap = await getDoc(friendCodeRef(normalized));
  if (!snap.exists()) return null;
  const uid = snap.data()?.uid;
  return typeof uid === 'string' ? uid : null;
}

export async function addFriendByUid(
  myUid: string,
  friendUid: string,
  friendDisplayName: string,
): Promise<void> {
  if (myUid === friendUid) throw new Error('You cannot add yourself');
  await setDoc(friendRef(myUid, friendUid), {
    displayName: friendDisplayName,
    addedAt: serverTimestamp(),
  });
}

export async function removeFriendByUid(myUid: string, friendUid: string): Promise<void> {
  await deleteDoc(friendRef(myUid, friendUid));
}

export function subscribeFriends(
  uid: string,
  onData: (friends: FriendEntry[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    friendsCol(uid),
    (snap) => {
      const friends: FriendEntry[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          displayName:
            typeof data.displayName === 'string' ? data.displayName : 'Friend',
        };
      });
      onData(friends);
    },
    (err) => onError?.(err as Error),
  );
}

export async function setMacroSocial(
  uid: string,
  streakAboveDays: number,
  streakBelowDays: number,
): Promise<void> {
  const data: MacroSocialPresence = {
    streakAboveDays,
    streakBelowDays,
    updatedAt: serverTimestamp(),
  };
  await setDoc(macroSocialRef(uid), data, {merge: true});
}

export function subscribeMacroSocial(
  uid: string,
  onData: (presence: MacroSocialPresence | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    macroSocialRef(uid),
    (snap) => onData(snap.exists() ? (snap.data() as MacroSocialPresence) : null),
    (err) => onError?.(err as Error),
  );
}
