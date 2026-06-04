import {useState} from 'react';
import toast from 'react-hot-toast';
import {useAuth} from './AuthContext.tsx';
import {ProfileNameField} from '../social/ProfileNameField.tsx';
import {useMacroCloudSyncStatus} from '../macroData/MacroCloudSyncContext.tsx';

function authErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as {message: string}).message);
  }
  return 'Something went wrong';
}

export function AccountSection() {
  const {
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
  } = useAuth();
  const {cloudEnabled, syncing} = useMacroCloudSyncStatus();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [linkEmailVal, setLinkEmailVal] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [openPanel, setOpenPanel] = useState<'sign-in' | 'create' | null>(null);

  function togglePanel(panel: 'sign-in' | 'create') {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  }

  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true);
    try {
      await action();
      if (success) toast.success(success);
    } catch (e) {
      toast.error(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-fg">Account</p>
        <p className="text-sm text-[#9ca3af]">
          Firebase is not configured. Add <code className="text-xs">VITE_FIREBASE_*</code> to{' '}
          <code className="text-xs">.env.local</code> and restart the dev server.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <p className="text-sm text-[#9ca3af]">Checking sign-in…</p>
      </div>
    );
  }

  function syncStatusLine() {
    if (!configured || !user) return null;
    if (syncing) {
      return <p className="text-xs text-[#9ca3af]">Syncing macros…</p>;
    }
    if (cloudEnabled) {
      return <p className="text-xs text-[#9ca3af]">Diary and goals sync to your account</p>;
    }
    return null;
  }

  if (user) {
    const label = user.email ?? (user.isAnonymous ? 'Guest (anonymous)' : 'Signed in');

    if (user.isAnonymous) {
      return (
        <div className="space-y-4">
          <p className="text-sm font-medium text-fg">Account</p>
          <p className="text-sm text-[#9ca3af]">{label}</p>
          {syncStatusLine()}
          <p className="text-xs text-[#9ca3af]">
            Link a permanent sign-in to keep this guest session and data (same user ID).
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => run(linkGoogle, 'Account linked with Google')}
            className="w-full rounded-full bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50"
          >
            Link Google account
          </button>

          <div className="space-y-2 border-t border-[var(--color-accent)]/10 pt-4">
            <p className="text-xs text-[#9ca3af]">Link email (creates password on this account)</p>
            <input
              type="email"
              autoComplete="email"
              value={linkEmailVal}
              onChange={(e) => setLinkEmailVal(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-3 py-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={linkPassword}
              onChange={(e) => setLinkPassword(e.target.value)}
              placeholder="New password (6+ characters)"
              className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-3 py-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
            />
            <button
              type="button"
              disabled={busy || !linkEmailVal || linkPassword.length < 6}
              onClick={() => run(() => linkEmail(linkEmailVal, linkPassword), 'Account linked with email')}
              className="w-full rounded-full bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)] disabled:opacity-50"
            >
              Link email account
            </button>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => run(signOut, 'Signed out')}
            className="w-full rounded-full bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)] disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
        <p className="mb-2 text-sm font-medium text-fg">Account</p>
        <p className="mb-1 break-all text-sm text-[#9ca3af]">{label}</p>
        {syncStatusLine()}
        <button
          className="mt-3 w-full rounded-full bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)] disabled:opacity-50"
          type="button"
          disabled={busy}
          onClick={() => run(signOut, 'Signed out')}
        >
          Sign out
        </button>
        <p className="mt-2 text-xs text-[#9ca3af]">
          Signs out of Workout and Macro on this device (same maxmvs.com login).
        </p>
        </div>
        <ProfileNameField />
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-3 py-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45';

  const panelBtn = (active: boolean) =>
    `flex-1 rounded-full py-3 text-sm font-medium transition disabled:opacity-50 ${
      active
        ? 'bg-[var(--color-accent)] text-white shadow-sm'
        : 'bg-[var(--color-surface)] text-fg hover:bg-[var(--color-panel-hover)]'
    }`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-fg">Account</p>
        <p className="mt-1 text-xs text-[#9ca3af]">
          Sign in to sync your diary, goals, and favorites across devices on maxmvs.com.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          className={panelBtn(openPanel === 'sign-in')}
          aria-expanded={openPanel === 'sign-in'}
          onClick={() => togglePanel('sign-in')}
        >
          Sign in
        </button>
        <button
          type="button"
          disabled={busy}
          className={panelBtn(openPanel === 'create')}
          aria-expanded={openPanel === 'create'}
          onClick={() => togglePanel('create')}
        >
          Create account
        </button>
      </div>

      {openPanel === 'sign-in' ? (
        <section className="space-y-3 rounded-2xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/40 p-4">
          <p className="text-xs text-[#9ca3af]">Use the method you signed up with before.</p>

          <button
            type="button"
            disabled={busy}
            onClick={() => run(signInGoogle, 'Signed in with Google')}
            className="w-full rounded-full bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50"
          >
            Google
          </button>

          <div className="space-y-2">
            <input
              type="email"
              autoComplete="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email"
              className={inputClass}
            />
            <input
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              className={inputClass}
            />
            <button
              type="button"
              disabled={busy || !loginEmail || !loginPassword}
              onClick={() => run(() => signInEmail(loginEmail, loginPassword), 'Signed in')}
              className="w-full rounded-full bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)] disabled:opacity-50"
            >
              Email
            </button>
          </div>
        </section>
      ) : null}

      {openPanel === 'create' ? (
        <section className="space-y-3 rounded-2xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/40 p-4">
          <p className="text-xs text-[#9ca3af]">
            Pick any option below. Google creates an account the first time you use it.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => run(signInGoogle, 'Account created with Google')}
            className="w-full rounded-full bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50"
          >
            Google
          </button>

          <div className="space-y-2">
            <input
              type="email"
              autoComplete="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="Email"
              className={inputClass}
            />
            <input
              type="password"
              autoComplete="new-password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Password (6+ characters)"
              className={inputClass}
            />
            <button
              type="button"
              disabled={busy || !createEmail || createPassword.length < 6}
              onClick={() => run(() => signUpEmail(createEmail, createPassword), 'Account created')}
              className="w-full rounded-full bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)] disabled:opacity-50"
            >
              Email
            </button>
          </div>

          <div className="border-t border-[var(--color-accent)]/10 pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(signInAnonymous, 'Continuing as guest')}
              className="w-full rounded-full bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)] disabled:opacity-50"
            >
              Guest (anonymous)
            </button>
            <p className="mt-2 text-xs text-[#9ca3af]">
              Temporary account on this device. Link Google or email later in Settings.
            </p>
          </div>
        </section>
      ) : null}

      {openPanel === null ? (
        <p className="text-center text-xs text-[#9ca3af]">Choose Sign in or Create account to see options.</p>
      ) : null}
    </div>
  );
}
