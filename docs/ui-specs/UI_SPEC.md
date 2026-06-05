# Macro Counter — UI spec

Single reference for toolbox shell, feature UI, legal placement, and PWA assets. Use when building or refactoring Macro Counter.

## Table of contents

1. [Toolbox shell](#1-toolbox-shell)
2. [Monthly calendar](#2-monthly-calendar)
3. [Disclaimer placement](#3-disclaimer-placement)
4. [PWA and Android icons](#4-pwa-and-android-icons)
5. [Reference files](#5-reference-files)
6. [Settings & Social pages (Workout parity)](#6-settings--social-pages-workout-parity)

---

## 1. Toolbox shell

Shared header chrome, blueprint grid, glass cards, theme (dark/light), accent palette, and settings cog. One visual language—not one-off styling per screen.

### 1.1 Stack expectations

| Piece | Version / notes |
|--------|------------------|
| **Tailwind CSS** | v4 with `@import "tailwindcss"` in CSS and **`@tailwindcss/vite`** in Vite |
| **Fonts** | Google Fonts: **Inter** (body) + **Space Grotesk** (headings / `.brand-font`) |
| **Framework** | React; **CSS tokens + `data-theme` + CSS variables** are portable to other stacks |

`vite.config.ts` must include the Tailwind Vite plugin.

### 1.2 Design rules

1. **Never hard-code the accent hex** in component classes for borders or glows. Use **`var(--color-accent)`** (`border-[var(--color-accent)]/10`, `/20`, etc.).
2. **Primary text** uses **`text-fg`**, not raw `text-white`, so light mode stays readable. Reserve **`text-white`** for buttons on **`bg-[var(--color-accent)]`**.
3. **Glass cards:** class **`glass`**; outer glow **`accent-glow`** (not `orange-glow`). Both use **`color-mix`** with **`--color-accent`**.
4. **Theme:** `html[data-theme="light"]` vs default dark—redefine tokens under `html[data-theme="light"]`, do not fork per-component stylesheets.
5. **Accent** at runtime on **`document.documentElement`** from presets (§1.5).
6. **Settings** and **Social** open as **modals** from header icons (§6). Legacy `/terms`, `/settings`, `/social` URLs redirect to query params that open the right modal.

### 1.3 `index.css` (single source of truth)

Copy the **entire** `src/index.css` when bootstrapping. Must include:

- `@theme { ... }` with **`--color-fg`** and surface tokens; default accent = orange.
- **`html[data-theme="light"] { ... }`** overrides.
- **`html[data-theme="light"] .glass`** and **`.blueprint-bg`** overrides.
- **`body`:** `bg-[var(--color-bg-dark)] text-[var(--color-fg)]`.
- **`.glass`**, **`.accent-glow`**, **`.blueprint-bg`** with **`color-mix(..., var(--color-accent), ...)`**.
- Scrollbar rules using accent variables.

Do **not** use legacy `orange-glow`, `text-white` on `body`, or hard-coded orange RGBA in `.glass` / `.blueprint-bg`.

### 1.4 Color tokens

| Token | Role |
|--------|------|
| **`--color-bg-dark`** | Page background + inner wells in cards |
| **`--color-chrome-bar`** | `<header>` and footer strip |
| **`--color-card-dark`** | Mixed into `.glass` |
| **`--color-surface`**, **`--color-surface-deep`** | Inputs, secondary buttons, deep insets |
| **`--color-accent`**, **`--color-accent-hover`** | Primary actions, focus, scrollbars (runtime) |
| **`--color-text-light`** | Secondary labels |
| **`--color-panel-hover`** | Hover on surfaces |
| **`--color-fg`** | Primary text/icons (`text-fg`) |

**Borders:** `/10` on outer glass and wells; `/20` on chips and inputs.

### 1.5 Theme and accent

**DOM:** `data-theme="light"` for light mode; `--color-accent` / `--color-accent-hover` set from preset + theme.

**Presets (same ids everywhere):** `orange` (default), `cyan`, `violet`, `green`, `rose`. Each preset has `darkAccent`, `darkHover`, `lightAccent`, `lightHover`.

**localStorage (Macro Counter):** `macrocounter-theme` (`light` | `dark`), `macrocounter-accent` (preset id).

**React:** `ThemeProvider` in `theme.tsx`; `useTheme()`; `applyDomTheme` + `applyAccentCssVars` on change.

**First paint:** synchronous inline script in `index.html` `<head>` before CSS/JS—read theme + accent, set `data-theme` and CSS vars. Hex map must match **`ACCENT_PRESETS`** in TypeScript.

### 1.6 Header chrome icons

**Header:** title left; right cluster: **Social** (`Users`, `h-5 w-5`) + **Settings** (`Settings`, `h-5 w-5`). Both use the same round hit target:

```tsx
const chromeIconClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg';
```

**Settings** is a header button that opens `SettingsModal` (`SettingsMenu.tsx` → `onOpen`).

**Social** is a header button that opens `SocialModal` on the main diary screen.

### 1.7 Page structure

```
┌ Root: min-h-screen + bg-dark + text-fg + blueprint-bg ─────────┐
│ Header: chrome-bar, title | SettingsMenu                        │
│ Main: grid gap-6                                                │
│   Section: glass + accent-glow + border accent/10               │
└─────────────────────────────────────────────────────────────────┘
```

**Root:**

```tsx
<div className="min-h-screen bg-[var(--color-bg-dark)] text-fg font-sans blueprint-bg">
```

**Header:**

```tsx
<header className="mb-5 flex items-center justify-between gap-4 border-b border-[var(--color-accent)]/20 bg-[var(--color-chrome-bar)] px-4 py-4 shadow-md md:px-8">
  <h1 className="min-w-0 text-2xl font-semibold leading-tight tracking-tight text-[var(--color-accent)] brand-font">
    Macro Counter
  </h1>
  <SettingsMenu />
</header>
```

**Main:** `grid gap-6 px-4 pt-3 pb-12 md:px-8 md:pt-5` (adjust bottom padding if fixed footer nav).

**Card:**

```tsx
<section className="glass rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow">
```

**Nested well:**

```tsx
<div className="rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-4 sm:p-5">
```

### 1.8 Typography

| Element | Classes |
|---------|---------|
| App title (`h1`) | `text-2xl font-semibold tracking-tight leading-tight text-[var(--color-accent)] brand-font` |
| Card title (`h2`) | `text-xl font-semibold text-fg brand-font` |
| Muted | `text-[var(--color-text-light)]` |
| Primary buttons | `bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]` |

### 1.9 Modal overlays

Settings and Social use centered modal panels (`z-[70]` / `z-[110]`), scroll lock, Escape to close, backdrop dismiss on main panel. See §6.

### 1.10 Shell checklist

- [ ] Tailwind v4 + `@tailwindcss/vite`
- [ ] Full `index.css`, `theme.tsx`, `SettingsMenu.tsx`, `ThemeProvider` in `main.tsx`
- [ ] `index.html` first-paint script in sync with `ACCENT_PRESETS`
- [ ] No hard-coded `#ff8800` or `orange-glow` in components
- [ ] `text-fg` for body copy; `text-white` only on accent-filled buttons
- [ ] Settings + Social modals; header icons `h-10 w-10` with `h-5 w-5` glyphs

---

## 2. Monthly calendar

Calendar header button and monthly modal in the Daily Totals card. Uses tokens and classes from §1.

### 2.1 Header buttons (calendar + goals)

In Daily Totals header, **left of** goals/target button:

| Element | Value |
|--------|--------|
| **Calendar icon** | Lucide **`CalendarDays`**, `h-5 w-5` |
| **Button classes** | `rounded-lg p-1.5 text-[var(--color-accent)] transition hover:bg-[var(--color-surface)]` |
| **Calendar `aria-label`** | `Open monthly calendar` |
| **Goals icon** | **`Target`**, same button classes, e.g. `Set daily goals` |

Accent icon on dark chrome; hover = surface fill only—no bordered pill.

### 2.2 Modal shell

**Backdrop:** `fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4` + `onClick={onClose}`

**Panel:** `glass w-full max-w-md rounded-2xl border border-[var(--color-accent)]/10 p-5 shadow-lg accent-glow` + `stopPropagation`

Lock `document.body.style.overflow` while open (same `useEffect` as other modals).

### 2.3 Modal header

`h2`: `text-lg font-semibold text-fg brand-font` — "Monthly Calendar". Close: **`X`**, `rounded-full p-1.5`, muted → hover surface.

### 2.4 Macro filter strip

Outer: `mb-4 flex gap-1 rounded-full bg-[var(--color-surface)] p-1`

Buttons: `flex-1 rounded-full py-1.5 text-xs font-medium capitalize transition`

Selected: `text-white shadow-sm` + inline `backgroundColor` per macro (calories / protein / carbs / fat colors in `App.tsx`).

### 2.5 Month navigation

`ChevronLeft` / `ChevronRight`: `rounded-lg p-1.5 text-[var(--color-text-light)] hover:bg-[var(--color-surface)] hover:text-fg`. Center: month label `text-sm font-semibold text-fg`.

### 2.6 Day grid

7-column grid; weekday labels `py-1.5 font-semibold text-[var(--color-text-light)]`.

Day cell: `flex flex-col items-center justify-center rounded-lg py-1.5 transition`.

**Today ring:** `boxShadow: 0 0 0 2px var(--color-bg-dark), 0 0 0 4px ${macroColor}`.

Status: **`ChevronUp`** / **`ChevronDown`**, `h-4 w-4`, `strokeWidth={3}`; empty `h-4 w-4` spacer when no status.

### 2.7 Legend

`mt-4 flex items-center justify-center gap-4 text-xs text-[var(--color-text-light)]` with small chevrons (`h-3.5`, `strokeWidth={3}`).

### 2.8 Calendar checklist

| Item | Match |
|------|--------|
| Calendar/target buttons | `rounded-lg p-1.5` + accent + surface hover |
| Modal | `z-50`, `glass`, `max-w-md` |
| Segmented filter | `rounded-full bg-[var(--color-surface)] p-1` |

**Reference:** `MacroCalendar` in `src/App.tsx`; state `calendarOpen`.

---

## 3. Disclaimer placement

Legal UX without bottom-chrome overlap on mobile.

### 3.1 Product decision

- **No** persistent legal footer on the main screen (fixed bottom meal bar is the "chin").
- Coverage via: **first-use gate**, **Settings → Legal** (in-page dropdown), legacy **`/terms`** redirect.

### 3.2 Required behavior

**First-use gate:** blocking modal until accept; versioned `localStorage` (`DisclaimerGate`, `DISCLAIMER_VERSION` in `src/Disclaimer.tsx`).

**Shell:** do not mount `DisclaimerFooter` in `main.tsx`. Main route `/` → diary (`App`). `/terms` → `/?legal=open`, `/settings` → `/?open=settings`, `/social` → `/?open=social` (legacy bookmarks).

**Settings legal:** expandable **Terms of use** inside the Settings modal. `TermsOfUseContent.tsx` holds the copy; `?legal=open` opens Settings with the dropdown expanded.

### 3.3 Placement rules

1. Never attach persistent legal text to fixed bottom action bars.
2. No duplicate legal footers.
3. Full legal copy in Settings legal dropdown (`TermsOfUseContent`); scrollable panel `max-h-[min(55vh,22rem)]`.

### 3.4 Accessibility

Keyboard-focusable legal links; safe-area-aware overlays (`env(safe-area-inset-*)`).

### 3.5 Checklists

**Regression:**

- [ ] Gate shows until acceptance; acceptance persisted
- [ ] No disclaimer footer on main screen
- [ ] Settings → Legal expands terms in-page
- [ ] `/terms` redirects to `/settings?legal=open`
- [ ] Mobile: legal UI not hidden behind bottom chin

**QA:**

- [ ] Legal reachable in ≤2 taps from home (Settings → Terms of use)
- [ ] Disclaimer gate link opens Settings legal

**Migrating to another app:** remove global disclaimer footers; add gate + Settings legal dropdown + `/terms` redirect; app-specific acknowledgement keys; bump version on material changes.

---

## 4. PWA and Android icons

Deployed at **`/macrocounter/`** on [maxmvs.com](https://maxmvs.com). Scoped manifest + maskable PNGs fix (1) Android white-bubble icons and (2) installs hijacking the whole origin.

### 4.1 Scoped manifest

| Field | Value |
|-------|--------|
| `id` | `/macrocounter/` |
| `start_url` | `/macrocounter/` |
| `scope` | `/macrocounter/` |

**Never** use `/` for `scope` or `start_url`.

File: `public/manifest.webmanifest`. Link in `index.html`:

```html
<link rel="manifest" href="%BASE_URL%manifest.webmanifest" />
```

Also:

```html
<link rel="apple-touch-icon" href="%BASE_URL%icons/apple-touch-icon.png" />
<meta name="theme-color" content="#2a3439" />
```

`display`: `standalone`; `orientation`: `portrait`; `background_color` / `theme_color`: `#2a3439`.

### 4.2 Icons

**Source:** `public/favicon.svg` (`#2a3439`, `#ff8800`, white chart mark).

**SVG masters (`public/icons/`):**

| File | Role |
|------|------|
| `icon-maskable.svg` | 512×512 full-bleed bg; artwork ~66% safe zone |
| `icon-any.svg` | Same branding; ~58% scale (more padding) |

**Generate (commit PNGs):**

```bash
npm run icons
```

Produces `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png` via `scripts/generatePwaIcons.mjs` (sharp).

Manifest `icons`: paths relative to manifest (`icons/icon-512.png`), `any` + `maskable` at 192 and 512.

### 4.3 After deploy

Users with old installs: uninstall home-screen shortcut → open `https://maxmvs.com/macrocounter/` → install again.

### 4.4 Verify

```bash
npm run icons
npm run build
```

Confirm `manifest.webmanifest` and PNGs under build output; production manifest URL returns JSON, not SPA HTML.

### 4.5 Do not

- Root-scope the manifest
- Use only SVG in manifest `icons` for Android maskable tiles
- Add a service worker (not used in this repo)

---

## 5. Reference files

| File | Purpose |
|------|---------|
| `src/index.css` | Tokens, light theme, glass, blueprint |
| `src/theme.tsx` | `ACCENT_PRESETS`, `ThemeProvider` |
| `src/SettingsMenu.tsx` | Header link to `/settings` |
| `src/SettingsModal.tsx` | Account, theme, accent, legal modal |
| `src/TermsOfUseContent.tsx` | Legal copy for Settings dropdown |
| `src/social/SocialModal.tsx` | Friends, codes, profile name modal |
| `src/social/FriendsList.tsx` | Friend rows + remove |
| `src/social/ProfileNameField.tsx` | Shared display name (Social only) |
| `src/App.tsx` | Diary shell, calendar, meal UI |
| `src/Disclaimer.tsx` | Gate + modal |
| `index.html` | First-paint theme/accent; manifest + apple-touch-icon |
| `public/manifest.webmanifest` | Scoped PWA manifest |
| `public/icons/*` | SVG masters + generated PNGs |
| `scripts/generatePwaIcons.mjs` | Icon rasterization |

When the app changes, update this document and the relevant section checklists.

---

## 6. Settings & Social modals (Workout parity)

Macro Counter mirrors **Workout Tracker AI** shell patterns (June 2026). Settings and Social are **modals** opened from header icons; the diary stays visible underneath.

### 6.1 Deep links

| URL | Behavior |
|-----|----------|
| `/?legal=open` | Open Settings modal, expand Terms |
| `/?open=settings` | Open Settings modal |
| `/?open=social` | Open Social modal |
| `/terms`, `/settings`, `/social` | Redirect to the query forms above (`main.tsx`) |

### 6.2 Settings modal

- Centered panel `max-w-md`, `max-h-[min(92dvh,40rem)]`, scrollable body, **Done** + backdrop close.
- **Account:** `AccountSection` only — **no profile name** (see Social).
- **App:** compact inline dark/light toggle; accent swatches left-aligned.
- **Legal:** chevron dropdown with scrollable `TermsOfUseContent`.

### 6.3 Social modal

- **Profile name** at top (`ProfileNameField`) — shared with Workout via Firestore `users/{uid}/profile/main`.
- **Add friend** / **Your code** — two-column button grid.
- **Add friend flow:** manual code first; optional camera scan (iOS-safe).
- **Friends:** `FriendsList` with streak rows + remove.
- Sub-panels (your code, add friend) use in-modal back navigation.

### 6.4 Workout-only: AI Coach modal

Workout Tracker opens **Coach** the same way (`AiChatScreen` with `layout="modal"`). Macro Counter has no coach header button.

### 6.5 Parity checklist

- [ ] Header Social + Settings icons same size (`h-10 w-10`, icon `h-5 w-5`)
- [ ] Profile name only on Social, not Settings
- [ ] `/terms` opens Settings legal via `/?legal=open`
- [ ] Friend remove works (`removeFriend` in `SocialContext`)
