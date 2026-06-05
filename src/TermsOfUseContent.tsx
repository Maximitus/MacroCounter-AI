import {DisclaimerBody} from './Disclaimer.tsx';
import {COPYRIGHT_OWNER, getCopyrightYear} from './siteMeta.ts';

export function TermsOfUseContent({compact = false}: {compact?: boolean}) {
  const year = getCopyrightYear();
  const bodyClass = compact
    ? 'space-y-4 text-xs leading-relaxed text-[var(--color-text-light)]'
    : 'space-y-8 text-sm leading-relaxed text-[var(--color-text-light)]';

  return (
    <div className={bodyClass}>
      <p>
        These Terms of Use (&quot;Terms&quot;) govern your access to and use of Macro Counter (the
        &quot;Service&quot;), including any website or deployment that presents this application. By
        using the Service, you agree to these Terms. If you do not agree, do not use the Service.
      </p>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-fg brand-font">Copyright and intellectual property</h3>
        <p>
          The Service, including its software, visual design, branding, text, and original content
          (excluding user-provided inputs and third-party materials), is owned by {COPYRIGHT_OWNER}{' '}
          and is protected by copyright and other intellectual property laws.
        </p>
        <p>
          © {year} {COPYRIGHT_OWNER}. All rights reserved. You may not copy, modify, distribute,
          sell, lease, or reverse engineer the Service or its source code except where allowed by
          applicable law or explicit written permission.
        </p>
        <p>
          You retain any rights you have in text, images, or other content you submit to the
          Service. You grant only the permissions necessary for the Service to process your
          submissions locally or through the Service&apos;s configured APIs (for example, to obtain
          AI estimates).
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-fg brand-font">License to use the Service</h3>
        <p>
          Subject to these Terms, you may use the Service for personal, non-commercial purposes
          unless we agree otherwise in writing. You may not use the Service in violation of law, to
          harm others, to scrape or overload infrastructure, to circumvent security, or to
          misrepresent affiliation with {COPYRIGHT_OWNER}.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-fg brand-font">Health and safety disclaimer</h3>
        <p>The following is incorporated into these Terms and applies whenever you use the Service:</p>
        <div className="rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-3">
          <DisclaimerBody />
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-fg brand-font">Privacy and data</h3>
        <p>
          The Service stores certain preferences and logs in your browser (for example,
          localStorage). AI features send the content you submit to third-party AI providers as
          configured for your deployment. Do not submit sensitive personal data or information you are
          not allowed to share.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-fg brand-font">Changes</h3>
        <p>
          We may update the Service or these Terms. Material changes may be reflected by updating
          the effective date or version shown in the app. Continued use after changes constitutes
          acceptance of the updated Terms.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-fg brand-font">Contact</h3>
        <p>
          For permissions or legal notices regarding these Terms or copyright, contact the operator
          of the deployment you are using.
        </p>
      </section>

      <p className="text-[var(--color-text-light)]/70">
        These Terms are provided for convenience and are not a substitute for legal advice tailored
        to your situation or jurisdiction.
      </p>
    </div>
  );
}
