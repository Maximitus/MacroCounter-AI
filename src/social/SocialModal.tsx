import {useEffect, useState} from 'react';
import QRCode from 'qrcode';
import {QrCode, ScanLine, Users, X} from 'lucide-react';
import toast from 'react-hot-toast';
import {ProfileNameField} from './ProfileNameField.tsx';
import {FriendQrScanner} from './FriendQrScanner.tsx';
import {FriendStreakRow} from './FriendStreakRow.tsx';
import {useSocial} from './SocialContext.tsx';

export function SocialModal({open, onClose}: {open: boolean; onClose: () => void}) {
  const {enabled, profile, friends, inviteUrl, addFriendByCode} = useSocial();
  const [panel, setPanel] = useState<'main' | 'show-code' | 'scan-code'>('main');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setPanel('main');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (panel !== 'show-code' || !inviteUrl) {
      setQrDataUrl(null);
      return;
    }
    void QRCode.toDataURL(inviteUrl, {margin: 1, width: 220}).then(setQrDataUrl);
  }, [panel, inviteUrl]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-page-title"
      onClick={onClose}
    >
      <div
        className="max-h-[min(92vh,40rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-bg-dark)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/15">
              <Users className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />
            </div>
            <p id="social-page-title" className="truncate text-lg font-semibold text-fg brand-font">
              Social
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-light)] hover:bg-[var(--color-surface)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {!enabled ? (
          <p className="text-sm text-[var(--color-text-light)]">
            Guest sign-in cannot use social. Link Google or email in Settings, then add friends.
          </p>
        ) : panel === 'show-code' && profile ? (
          <div className="space-y-4">
            <button
              type="button"
              className="text-sm text-[var(--color-accent)] hover:underline"
              onClick={() => setPanel('main')}
            >
              ← Back
            </button>
            <p className="text-center text-sm text-[var(--color-text-light)]">
              Friends scan or open this link to add you. Works across Workout and Macro.
            </p>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code for friend invite"
                className="mx-auto rounded-lg bg-white p-2"
              />
            ) : null}
            <p className="text-center font-mono text-lg font-bold tracking-widest text-fg">
              {profile.friendCode}
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg hover:bg-[var(--color-panel-hover)]"
              onClick={() => {
                void navigator.clipboard.writeText(profile.friendCode);
                toast.success('Code copied');
              }}
            >
              Copy code
            </button>
          </div>
        ) : panel === 'scan-code' ? (
          <div className="space-y-4">
            <button
              type="button"
              className="text-sm text-[var(--color-accent)] hover:underline"
              onClick={() => setPanel('main')}
            >
              ← Back
            </button>

            <FriendQrScanner
              active={open && panel === 'scan-code'}
              onCode={async (code) => {
                if (busy) return;
                setBusy(true);
                try {
                  await addFriendByCode(code);
                  setFriendCodeInput('');
                  setPanel('main');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Could not add friend');
                } finally {
                  setBusy(false);
                }
              }}
            />

            <p className="text-sm text-[var(--color-text-light)]">
              Or enter your friend&apos;s code manually:
            </p>
            <input
              type="text"
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
              placeholder="Friend code"
              className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-3 py-2 font-mono text-sm tracking-wider text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
              autoCapitalize="characters"
            />
            <button
              type="button"
              disabled={busy || friendCodeInput.trim().length < 6}
              className="w-full rounded-full bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              onClick={async () => {
                setBusy(true);
                try {
                  await addFriendByCode(friendCodeInput);
                  setFriendCodeInput('');
                  setPanel('main');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Could not add friend');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Add friend
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <ProfileNameField />
            </div>

            <p className="mb-3 text-xs text-[var(--color-text-light)]">
              Friends see your calorie streak (above/below daily goal).
            </p>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-surface)] px-3 py-3 text-sm font-medium text-fg hover:bg-[var(--color-panel-hover)]"
                onClick={() => setPanel('scan-code')}
              >
                <ScanLine className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                Scan code
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-surface)] px-3 py-3 text-sm font-medium text-fg hover:bg-[var(--color-panel-hover)]"
                onClick={() => setPanel('show-code')}
              >
                <QrCode className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                Show code
              </button>
            </div>

            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-light)]">
              Friends
            </p>
            {friends.length === 0 ? (
              <p className="text-sm text-[var(--color-text-light)]">
                No friends yet. Use Scan or Show code — add someone from Workout or Macro.
              </p>
            ) : (
              <ul className="max-h-[min(40vh,16rem)] space-y-2 overflow-y-auto">
                {friends.map((f) => (
                  <li
                    key={f.uid}
                    className="rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/50 px-3 py-2"
                  >
                    <FriendStreakRow friend={f} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
