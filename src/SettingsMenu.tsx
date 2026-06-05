/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {Settings} from 'lucide-react';

const chromeIconClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg';

export function SettingsMenu({onOpen}: {onOpen: () => void}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={chromeIconClass}
      aria-label="Open settings"
      title="Settings"
    >
      <Settings className="h-5 w-5" aria-hidden />
    </button>
  );
}
