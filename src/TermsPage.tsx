/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DisclaimerBody } from './Disclaimer.tsx';
import { COPYRIGHT_OWNER, getCopyrightYear } from './siteMeta.ts';

export default function TermsPage() {
  const year = getCopyrightYear();
  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] text-white font-sans flex flex-col">
      <header className="p-6 bg-[var(--color-card-dark)] shadow-sm border-b border-neutral-700 flex items-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back to app
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-accent)]">Terms of use</h1>
      </header>

      <main className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-8 text-sm leading-relaxed text-neutral-300">
        <p className="text-neutral-400 text-xs uppercase tracking-wide">Effective</p>
        <p>
          These Terms of Use (&quot;Terms&quot;) govern your access to and use of Macro Counter
          (the &quot;Service&quot;), including any website or deployment that presents this
          application. By using the Service, you agree to these Terms. If you do not agree, do not
          use the Service.
        </p>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Copyright and intellectual property</h2>
          <p>
            The Service, including its software, visual design, branding, text, and original
            content (excluding user-provided inputs and third-party materials), is owned by{' '}
            {COPYRIGHT_OWNER} and is protected by copyright and other intellectual property laws.
          </p>
          <p>
            © {year} {COPYRIGHT_OWNER}. All rights reserved. You may not copy, modify, distribute,
            sell, lease, or reverse engineer the Service or its source code except where allowed by
            applicable law or explicit written permission.
          </p>
          <p>
            You retain any rights you have in text, images, or other content you submit to the
            Service. You grant only the permissions necessary for the Service to process your
            submissions locally or through the Service&apos;s configured APIs (for example, to
            obtain AI estimates).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">License to use the Service</h2>
          <p>
            Subject to these Terms, you may use the Service for personal, non-commercial purposes
            unless we agree otherwise in writing. You may not use the Service in violation of law,
            to harm others, to scrape or overload infrastructure, to circumvent security, or to
            misrepresent affiliation with {COPYRIGHT_OWNER}.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Health and safety disclaimer</h2>
          <p>
            The following is incorporated into these Terms and applies whenever you use the
            Service:
          </p>
          <div className="rounded-xl border border-neutral-700 bg-[var(--color-card-dark)] p-4 text-neutral-300">
            <DisclaimerBody />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Privacy and data</h2>
          <p>
            The Service stores certain preferences and logs in your browser (for example,
            localStorage). AI features send the content you submit to third-party AI providers as
            configured for your deployment. Do not submit sensitive personal data or information you
            are not allowed to share.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Changes</h2>
          <p>
            We may update the Service or these Terms. Material changes may be reflected by updating
            the effective date or version shown in the app. Continued use after changes constitutes
            acceptance of the updated Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Contact</h2>
          <p>
            For permissions or legal notices regarding these Terms or copyright, contact the
            operator of the deployment you are using.
          </p>
        </section>

        <p className="text-xs text-neutral-500 border-t border-neutral-700 pt-6">
          These Terms are provided for convenience and are not a substitute for legal advice
          tailored to your situation or jurisdiction.
        </p>
      </main>
    </div>
  );
}
