/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { getCopyrightLine } from './siteMeta.ts';

/** Increment when disclaimer text changes materially so returning users see the update. */
export const DISCLAIMER_VERSION = 1;

const STORAGE_KEY = 'macrocounter_disclaimer_ack';

function readAck(): { v: number; accepted: boolean } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: number; accepted?: boolean };
    if (typeof parsed.v !== 'number' || typeof parsed.accepted !== 'boolean') return null;
    return { v: parsed.v, accepted: parsed.accepted };
  } catch {
    return null;
  }
}

export function DisclaimerGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const ack = readAck();
    const needsAck = !ack || ack.v < DISCLAIMER_VERSION || !ack.accepted;
    setOpen(needsAck);
    setReady(true);
  }, []);

  const accept = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: DISCLAIMER_VERSION, accepted: true }),
    );
    setOpen(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen blueprint-bg text-white flex items-center justify-center">
        <p className="text-sm text-[var(--color-text-light)]">Loading…</p>
      </div>
    );
  }

  return (
    <>
      {children}
      {open && (
        <DisclaimerModal
          agreed={agreed}
          onAgreedChange={setAgreed}
          onAccept={accept}
        />
      )}
    </>
  );
}

function DisclaimerModal({
  agreed,
  onAgreedChange,
  onAccept,
}: {
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  onAccept: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      aria-describedby="disclaimer-body"
    >
      <div className="flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col rounded-2xl border border-neutral-600 bg-[var(--color-card-dark)] shadow-xl">
        <div className="flex shrink-0 items-start gap-3 border-b border-neutral-700 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="disclaimer-title" className="text-lg font-semibold text-white">
              Important notice
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-light)]">
              You must read and accept this before using Macro Counter.
            </p>
          </div>
        </div>
        <div
          id="disclaimer-body"
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-neutral-300"
        >
          <DisclaimerBody />
        </div>
        <div className="shrink-0 space-y-3 border-t border-neutral-700 p-5">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-200">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => onAgreedChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-500 bg-[var(--color-surface)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <span>
              I have read and understood this notice. I agree to use Macro Counter only on these
              terms.
            </span>
          </label>
          <button
            type="button"
            disabled={!agreed}
            onClick={onAccept}
            className="w-full rounded-full bg-[var(--color-accent)] py-3.5 font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export function DisclaimerBody() {
  return (
    <div className="space-y-4">
      <p className="text-neutral-400 text-xs uppercase tracking-wide">Summary</p>
      <p>
        Macro Counter provides <strong className="text-neutral-200">approximate</strong> nutrition
        information and convenience tools only. It is{' '}
        <strong className="text-neutral-200">not</strong> medical advice, dietetic advice, or a
        substitute for a qualified professional. AI-generated numbers can be wrong.
      </p>
      <p className="text-neutral-400 text-xs uppercase tracking-wide">Full terms</p>
      <ol className="list-decimal space-y-3 pl-4 marker:text-neutral-500">
        <li>
          <strong className="text-neutral-200">No professional relationship.</strong> Using this app
          does not create a doctor–patient, dietitian–client, or any other professional relationship.
        </li>
        <li>
          <strong className="text-neutral-200">Not medical or nutrition advice.</strong> Content is
          for general informational and educational purposes. Do not use it to diagnose, treat,
          cure, or prevent any disease or health condition.
        </li>
        <li>
          <strong className="text-neutral-200">AI and data limitations.</strong> Estimates from
          photos, text descriptions, presets, and AI-suggested goals are automated approximations and
          may be inaccurate, incomplete, or inappropriate for you (including allergies, medications,
          pregnancy, eating disorders, athletic needs, or medical diets).
        </li>
        <li>
          <strong className="text-neutral-200">Your responsibility.</strong> You alone are responsible
          for what you eat and for verifying nutrition information when it matters. Consult a
          licensed physician, registered dietitian, or other qualified professional for personal
          guidance.
        </li>
        <li>
          <strong className="text-neutral-200">No warranty.</strong> The service is provided &quot;AS
          IS&quot; and &quot;AS AVAILABLE,&quot; without warranties of any kind, whether express or
          implied, including merchantability, fitness for a particular purpose, accuracy, or
          non-infringement, to the fullest extent permitted by law.
        </li>
        <li>
          <strong className="text-neutral-200">Limitation of liability.</strong> To the maximum
          extent permitted by applicable law, the owners, operators, affiliates, and contributors
          of Macro Counter disclaim liability for any direct, indirect, incidental, consequential,
          special, exemplary, or punitive damages, or any loss of profits, data, goodwill, or other
          intangible losses, arising from your access to or use of (or inability to use) the
          service or from reliance on any information it provides.
        </li>
        <li>
          <strong className="text-neutral-200">Third-party services.</strong> Features may depend on
          third-party APIs (for example, AI providers). Those services have their own terms,
          outages, and behaviors; we do not control them.
        </li>
        <li>
          <strong className="text-neutral-200">Public use.</strong> If you share access or deploy
          this app for others, each user is bound by this notice; you are responsible for your own
          deployment and compliance with applicable laws.
        </li>
        <li>
          <strong className="text-neutral-200">Severability.</strong> If any part of this notice is
          held unenforceable, the remainder stays in effect to the fullest extent permitted.
        </li>
      </ol>
      <p className="border-t border-neutral-700 pt-4 text-xs text-neutral-500">
        This notice is not legal advice. Laws vary by place and situation. For binding protection,
        have an attorney review your product, hosting, and liability setup.
      </p>
    </div>
  );
}

export function DisclaimerFooter() {
  const [voluntaryOpen, setVoluntaryOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-neutral-800 bg-[var(--color-card-dark)] px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-2 text-center text-xs leading-relaxed text-neutral-500">
          <p className="text-neutral-400">{getCopyrightLine()}</p>
          <p>
            Macro Counter is for general information only—not medical or dietetic advice. AI
            estimates may be inaccurate.{' '}
            <button
              type="button"
              onClick={() => setVoluntaryOpen(true)}
              className="text-[var(--color-accent)] underline-offset-2 hover:underline"
            >
              Full disclaimer
            </button>
            .{' '}
            <Link
              to="/terms"
              className="text-[var(--color-accent)] underline-offset-2 hover:underline"
            >
              Terms of use
            </Link>
            . Use at your own risk.
          </p>
        </div>
      </footer>
      {voluntaryOpen && (
        <div
          className="fixed inset-0 z-[99] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-footer-title"
        >
          <div className="flex max-h-[min(85vh,36rem)] w-full max-w-lg flex-col rounded-2xl border border-neutral-600 bg-[var(--color-card-dark)] shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-700 px-5 py-4">
              <h2 id="disclaimer-footer-title" className="text-lg font-semibold text-white">
                Disclaimer
              </h2>
              <button
                type="button"
                onClick={() => setVoluntaryOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-neutral-300">
              <DisclaimerBody />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
