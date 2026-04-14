# Disclaimer placement — UI spec (Macro Counter)

Use this document to keep legal/disclaimer UX consistent while avoiding bottom-chrome overlap on mobile devices.

---

## 1. Product decision

- Do **not** render a persistent legal/disclaimer footer on the primary capture screen.
- The capture screen already has a fixed bottom action bar ("chin"), so persistent footer copy is visually hidden or crowded.
- Keep legal coverage via:
  - **Mandatory first-use gate** (`DisclaimerGate`) before app usage.
  - **Full legal page** (`/terms`) containing terms + full disclaimer.
  - **In-app legal navigation** from Settings.

---

## 2. Required behavior

### 2.1 First-use gate (blocking modal)

- App must show the disclaimer gate until user explicitly accepts.
- Acceptance is persisted in `localStorage` (versioned key) so users are reprompted on material disclaimer updates.
- Gate modal should remain vertically centered and include safe-area-aware overlay padding.

Reference: `src/Disclaimer.tsx` (`DisclaimerGate`, `DisclaimerModal`, `DISCLAIMER_VERSION`).

### 2.2 Main app shell

- Do not mount `DisclaimerFooter` globally in `main.tsx`.
- Routes should render app content directly:
  - `/` -> `App`
  - `/terms` -> `TermsPage`

Reference: `src/main.tsx`.

### 2.3 Legal discoverability

- Settings modal must include a clear legal entry point linking to `/terms`.
- Recommended copy: **"Terms of use and full disclaimer"**.

Reference: `src/SettingsMenu.tsx`.

---

## 3. Placement rules

1. **Never attach persistent legal text to fixed bottom bars** used for core actions.
2. **Avoid duplicated legal footers** on screens with dense controls or gesture-nav overlap risk.
3. **Prefer explicit legal navigation** (Settings -> Terms) over always-on tiny footer text.
4. **Keep legal text readable**: full content belongs on `/terms`, not compressed into action chrome.

---

## 4. Accessibility + mobile constraints

- All legal links must be keyboard-focusable and screen-reader clear.
- Dialog overlays should account for safe areas:
  - `env(safe-area-inset-top)`
  - `env(safe-area-inset-bottom)`
- Do not rely on footer text that can sit under gesture indicators/home bars.

---

## 5. Regression checklist

- [ ] App opens with disclaimer gate for users without acceptance.
- [ ] Accepting gate stores acknowledgement and unlocks app.
- [ ] Capture screen has no persistent disclaimer footer.
- [ ] Settings includes link to `/terms`.
- [ ] `/terms` shows full disclaimer content.
- [ ] Mobile viewport: no legal UI hidden behind bottom "chin".
