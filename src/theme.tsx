/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const THEME_STORAGE_KEY = 'macrocounter-theme';
const ACCENT_STORAGE_KEY = 'macrocounter-accent';

export type Theme = 'light' | 'dark';

export type AccentPreset = {
  id: string;
  label: string;
  darkAccent: string;
  darkHover: string;
  lightAccent: string;
  lightHover: string;
};

/** Preset accents: dark + light pairs for readable contrast on each background. */
export const ACCENT_PRESETS: readonly AccentPreset[] = [
  {
    id: 'orange',
    label: 'Orange',
    darkAccent: '#ff8c00',
    darkHover: '#e67e00',
    lightAccent: '#e67300',
    lightHover: '#cc6600',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    darkAccent: '#26d6f0',
    darkHover: '#0eb8d9',
    lightAccent: '#0891b2',
    lightHover: '#0e7490',
  },
  {
    id: 'violet',
    label: 'Violet',
    darkAccent: '#a588f7',
    darkHover: '#8b6cf0',
    lightAccent: '#7c3aed',
    lightHover: '#6d28d9',
  },
  {
    id: 'green',
    label: 'Green',
    darkAccent: '#4ade80',
    darkHover: '#22c55e',
    lightAccent: '#16a34a',
    lightHover: '#15803d',
  },
  {
    id: 'rose',
    label: 'Rose',
    darkAccent: '#f87171',
    darkHover: '#ef4444',
    lightAccent: '#e11d48',
    lightHover: '#be123c',
  },
];

export function getAccentPreset(id: string): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
}

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  return 'dark';
}

function readStoredAccentId(): string {
  try {
    const v = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (v && ACCENT_PRESETS.some((p) => p.id === v)) return v;
  } catch {
    /* ignore */
  }
  return ACCENT_PRESETS[0].id;
}

export function applyDomTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function applyAccentCssVars(theme: Theme, accentId: string) {
  const p = getAccentPreset(accentId);
  const accent = theme === 'light' ? p.lightAccent : p.darkAccent;
  const hover = theme === 'light' ? p.lightHover : p.darkHover;
  const root = document.documentElement;
  root.style.setProperty('--color-accent', accent);
  root.style.setProperty('--color-accent-hover', hover);
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  accentId: string;
  setAccentId: (id: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const [accentId, setAccentIdState] = useState(() => readStoredAccentId());

  useEffect(() => {
    applyDomTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    applyAccentCssVars(theme, accentId);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accentId);
    } catch {
      /* ignore */
    }
  }, [theme, accentId]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setAccentId = useCallback((id: string) => {
    if (ACCENT_PRESETS.some((p) => p.id === id)) {
      setAccentIdState(id);
    }
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, accentId, setAccentId }),
    [theme, setTheme, toggleTheme, accentId, setAccentId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
