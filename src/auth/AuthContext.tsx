import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {getFirebaseAuth, isFirebaseConfigured} from '../firebase.ts';

type AuthContextValue = {
  configured: boolean;
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInAnonymous: () => Promise<void>;
  signOut: () => Promise<void>;
  linkGoogle: () => Promise<void>;
  linkEmail: (email: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, [configured]);

  function requireAnonymousUser(): User {
    const u = getFirebaseAuth().currentUser;
    if (!u?.isAnonymous) {
      throw new Error('Sign in as a guest first, or sign out and try again');
    }
    return u;
  }

  const signInGoogle = useCallback(async () => {
    await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  }, []);

  const signInAnonymous = useCallback(async () => {
    await signInAnonymously(getFirebaseAuth());
  }, []);

  const linkGoogle = useCallback(async () => {
    const u = requireAnonymousUser();
    await linkWithPopup(u, new GoogleAuthProvider());
  }, []);

  const linkEmail = useCallback(async (email: string, password: string) => {
    const u = requireAnonymousUser();
    const credential = EmailAuthProvider.credential(email.trim(), password);
    await linkWithCredential(u, credential);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      user,
      loading,
      signInGoogle,
      signInEmail,
      signUpEmail,
      signInAnonymous,
      signOut,
      linkGoogle,
      linkEmail,
    }),
    [
      configured,
      user,
      loading,
      signInGoogle,
      signInEmail,
      signUpEmail,
      signInAnonymous,
      signOut,
      linkGoogle,
      linkEmail,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
