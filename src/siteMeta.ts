/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Legal name or project name shown in copyright notices — change to your legal name if needed. */
export const COPYRIGHT_OWNER = 'Macro Counter';

export function getCopyrightYear(): number {
  return new Date().getFullYear();
}

/** Short line for footers and UI. */
export function getCopyrightLine(): string {
  return `© ${getCopyrightYear()} ${COPYRIGHT_OWNER}. All rights reserved.`;
}
