import {useState} from 'react';
import toast from 'react-hot-toast';
import {useAuth} from './AuthContext.tsx';
import {useMacroCloudSyncStatus} from '../macroData/MacroCloudSyncContext.tsx';

function authErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as {message: string}).message);
  }
  return 'Something went wrong';
}

const inputClass =
  'w-full rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45';

const btnPrimary =
  'w-full rounded-full bg-[var(--color-accent)] py-2 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50';

const btnSecondary =
  'w-full rounded-full bg-[var(--color-surface)] py-2 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)] disabled:opacity-50';

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
      <div className="rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/40 px-3 py-2.5">
        <p className="text-sm font-medium text-fg">Account</p>
        <p className="mt-1 text-xs text-[#9ca3af]">
          Firebase is not configured. Add <code className="text-[10px]">VITE_FIREBASE_*</code> to{' '}
          <code className="text-[10px]">.env.local</code> and restart the dev server.
        </p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-xs text-[#9ca3af]">Checking sign-in…</p>;
  }

  function syncStatusLine() {
    if (!configured || !user) return null;
    if (syncing) return <span className="text-[11px] text-[#9ca3af]">Syncing…</span>;
    if (cloudEnabled) return <span className="text-[11px] text-[#9ca3af]">Cloud sync on</span>;
    return null;
  }

  if (user) {
    const label = user.email ?? (user.isAnonymous ? 'Guest' : 'Signed in');

    if (user.isAnonymous) {
      return (
        <div className="space-y-2.5 rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/40 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">Account</p>
              <p className="truncate text-xs text-[#9ca3af]">{label}</p>
            </div>
            {syncStatusLine()}
          </div>
          <p className="text-[11px] leading-snug text-[#9ca3af]">
            Link Google or email to keep this guest session.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(linkGoogle, 'Account linked with Google')}
            className={btnPrimary}
          >
            Link Google
          </button>
          <details className="group rounded-lg border border-[var(--color-accent)]/10 bg-[var(--color-surface)]/50">
            <summary className="cursor-pointer list-none px-2.5 py-2 text-xs font-medium text-fg marker:content-none [&::-webkit-details-marker]:hidden">
              Link email
            </summary>
            <div className="space-y-2 border-t border-[var(--color-accent)]/10 px-2.5 pb-2.5 pt-2">
              <input
                type="email"
                autoComplete="email"
                value={linkEmailVal}
                onChange={(e) => setLinkEmailVal(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
              <input
                type="password"
                autoComplete="new-password"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                placeholder="Password (6+)"
                className={inputClass}
              />
              <button
                type="button"
                disabled={busy || !linkEmailVal || linkPassword.length < 6}
                onClick={() => run(() => linkEmail(linkEmailVal, linkPassword), 'Account linked')}
                className={btnSecondary}
              >
                Link email
              </button>
            </div>
          </details>
          <button type="button" disabled={busy} onClick={() => run(signOut, 'Signed out')} className={btnSecondary}>
            Sign out
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2.5 rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/40 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">Account</p>
            <p className="truncate text-xs text-[#9ca3af]">{label}</p>
          </div>
          {syncStatusLine()}
        </div>
        <button type="button" disabled={busy} onClick={() => run(signOut, 'Signed out')} className={btnSecondary}>
          Sign out
        </button>
      </div>
    );
  }

  const panelBtn = (active: boolean) =>
    `flex-1 rounded-full py-2 text-sm font-medium transition disabled:opacity-50 ${
      active
        ? 'bg-[var(--color-accent)] text-white shadow-sm'
        : 'bg-[var(--color-surface)] text-fg hover:bg-[var(--color-panel-hover)]'
    }`;

  return (
    <div className="space-y-2.5 rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/40 px-3 py-2.5">
      <p className="text-sm font-medium text-fg">Account</p>
      <p className="text-[11px] leading-snug text-[#9ca3af]">
        Sign in to sync your diary and goals on maxmvs.com.
      </p>
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
          Create
        </button>
      </div>
      {openPanel === 'sign-in' ? (
        <section className="space-y-2 rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/60 p-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(signInGoogle, 'Signed in with Google')}
            className={btnPrimary}
          >
            Google
          </button>
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
            className={btnSecondary}
          >
            Email sign in
          </button>
        </section>
      ) : null}
      {openPanel === 'create' ? (
        <section className="space-y-2 rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/60 p-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(signInGoogle, 'Account created with Google')}
            className={btnPrimary}
          >
            Google
          </button>
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
            placeholder="Password (6+)"
            className={inputClass}
          />
          <button
            type="button"
            disabled={busy || !createEmail || createPassword.length < 6}
            onClick={() => run(() => signUpEmail(createEmail, createPassword), 'Account created')}
            className={btnSecondary}
          >
            Create with email
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(signInAnonymous, 'Continuing as guest')}
            className={btnSecondary}
          >
            Guest (anonymous)
          </button>
        </section>
      ) : null}
    </div>
  );
}
