import {useEffect, useState} from 'react';
import QRCode from 'qrcode';
import {ChevronLeft, QrCode, ScanLine, X} from 'lucide-react';
import toast from 'react-hot-toast';
import {useTheme} from '../theme.tsx';
import {FriendQrScanner} from './FriendQrScanner.tsx';
import {FriendsList} from './FriendsList.tsx';
import {ProfileNameField} from './ProfileNameField.tsx';
import {useSocial} from './SocialContext.tsx';

export function SocialModal({open, onClose}: {open: boolean; onClose: () => void}) {
  const {theme} = useTheme();
  const {enabled, profile, inviteUrl, addFriendByCode} = useSocial();
  const [panel, setPanel] = useState<'main' | 'show-code' | 'scan-code'>('main');
  const [scanSession, setScanSession] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [cameraScanEnabled, setCameraScanEnabled] = useState(false);

  useEffect(() => {
    if (!open) {
      setPanel('main');
      setScanSession(0);
      setCameraScanEnabled(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (panel !== 'main') {
        setCameraScanEnabled(false);
        setPanel('main');
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, panel, onClose]);

  useEffect(() => {
    if (panel !== 'show-code' || !inviteUrl) {
      setQrDataUrl(null);
      return;
    }
    void QRCode.toDataURL(inviteUrl, {margin: 1, width: 220}).then(setQrDataUrl);
  }, [panel, inviteUrl]);

  if (!open) return null;

  const panelTitle =
    panel === 'scan-code' ? 'Add friend' : panel === 'show-code' ? 'Your code' : 'Social';

  function panelBody() {
    if (!enabled) {
      return (
        <p className="text-sm text-[var(--color-text-light)]">
          Guest sign-in cannot use social. Link Google or email in Settings, then add friends.
        </p>
      );
    }

    if (panel === 'show-code' && profile) {
      return (
        <div className="space-y-4">
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
      );
    }

    if (panel === 'scan-code') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-light)]">Enter your friend&apos;s code:</p>
          <input
            type="text"
            value={friendCodeInput}
            onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
            placeholder="Friend code"
            className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-3 py-2 font-mono text-sm tracking-wider text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
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

          {cameraScanEnabled ? (
            <div key={scanSession}>
              <FriendQrScanner
                onCode={async (code) => {
                  if (busy) return;
                  setBusy(true);
                  try {
                    await addFriendByCode(code);
                    setFriendCodeInput('');
                    setCameraScanEnabled(false);
                    setPanel('main');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Could not add friend');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg hover:bg-[var(--color-panel-hover)]"
              onClick={() => {
                setScanSession((n) => n + 1);
                setCameraScanEnabled(true);
              }}
            >
              <ScanLine className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
              Scan QR with camera
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <ProfileNameField />

        <p className="text-xs text-[var(--color-text-light)]">
          Friends see your calorie streak (above/below daily goal).
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-surface)] px-3 py-3 text-sm font-medium text-fg hover:bg-[var(--color-panel-hover)]"
            onClick={() => {
              setScanSession((n) => n + 1);
              setPanel('scan-code');
            }}
          >
            <ScanLine className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
            Add friend
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-surface)] px-3 py-3 text-sm font-medium text-fg hover:bg-[var(--color-panel-hover)]"
            onClick={() => setPanel('show-code')}
          >
            <QrCode className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
            Your code
          </button>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-light)]">
            Your friends
          </p>
          <FriendsList />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative flex max-h-[min(92dvh,40rem)] w-full max-w-md flex-col rounded-[1.25rem] border p-4 shadow-lg accent-glow sm:p-5 ${
          theme === 'dark'
            ? 'border-[var(--color-accent)]/20 bg-[#2c3338]'
            : 'glass border-[var(--color-accent)]/15'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-accent)]/10 pb-3">
          {panel !== 'main' ? (
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-0.5 rounded-lg py-0.5 text-left hover:bg-[var(--color-surface)]"
              onClick={() => {
                setCameraScanEnabled(false);
                setPanel('main');
              }}
              aria-label="Back to Social"
            >
              <ChevronLeft className="h-5 w-5 shrink-0 text-[var(--color-text-light)]" aria-hidden />
              <h2 id="social-modal-title" className="truncate text-lg font-semibold text-fg brand-font">
                {panelTitle}
              </h2>
            </button>
          ) : (
            <h2 id="social-modal-title" className="text-lg font-semibold text-fg brand-font">
              Social
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
            aria-label="Close social"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5">
          {panelBody()}
        </div>

        <button
          type="button"
          className={`mt-3 w-full shrink-0 rounded-full py-2.5 text-sm font-medium transition ${
            theme === 'dark'
              ? 'bg-[var(--color-surface)] text-white hover:bg-[var(--color-panel-hover)]'
              : 'bg-[var(--color-surface)] text-fg hover:bg-[var(--color-panel-hover)]'
          }`}
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}
