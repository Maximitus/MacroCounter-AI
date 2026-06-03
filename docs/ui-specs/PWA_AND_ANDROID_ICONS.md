# PWA manifest and Android launcher icons (Macro Counter)

Macro Counter is one of several toolbox PWAs on [maxmvs.com](https://maxmvs.com). Each app must have its **own scoped manifest** and **maskable PNG icons** so installs do not hijack the whole domain and Android home-screen tiles do not show a tiny logo in a white circle.

Production URL: `https://maxmvs.com/macrocounter/`

## Scoped manifest (fixes `/workout/` opening Macro Counter)

The web app manifest **must** use paths under this app only:

| Field | Value |
|-------|--------|
| `id` | `/macrocounter/` |
| `start_url` | `/macrocounter/` |
| `scope` | `/macrocounter/` |

Do **not** set `scope` or `start_url` to `/` or the site root. An unscoped or root-scoped install makes the browser treat Macro Counter as the handler for all of `maxmvs.com`, including sister apps like Workout (`/workout/`).

File: `public/manifest.webmanifest`  
Linked from `index.html`:

```html
<link rel="manifest" href="%BASE_URL%manifest.webmanifest" />
```

Vite `base` is `/macrocounter/`, so the built manifest is served at `/macrocounter/manifest.webmanifest` as static JSON (not SPA HTML). After deploy, verify with curl or DevTools → Application → Manifest.

## Android launcher icons (fixes white bubble)

Adaptive icons on Android crop the center of the icon and apply a mask. If the asset is a small graphic on a transparent or white canvas, the tile looks like a **small square in a white bubble**.

### Source artwork

- Branding comes from `public/favicon.svg` (toolbox `#2a3439`, accent `#ff8800`, white chart mark).
- Do not replace with a unrelated logo.

### SVG masters (`public/icons/`)

| File | Role |
|------|------|
| `icon-maskable.svg` | 512×512, **full-bleed** `#2a3439` background; favicon artwork scaled to ~66% safe zone (center) for `purpose: "maskable"` |
| `icon-any.svg` | Same colors; slightly more padding (~58% scale) for `purpose: "any"` |

### Generated PNGs (committed)

Run locally when SVG masters change:

```bash
npm run icons
```

`scripts/generatePwaIcons.mjs` uses **sharp** to produce:

- `icon-192.png`, `icon-512.png` (from `icon-any.svg`)
- `icon-maskable-192.png`, `icon-maskable-512.png` (from `icon-maskable.svg`)
- `apple-touch-icon.png` (180×180, from `icon-any.svg`)

Commit the PNGs so Cloudflare deploy does not require a separate icon build on CI.

### Manifest `icons` array

Paths are **relative to the manifest file** (e.g. `icons/icon-512.png`), with separate entries for `any` and `maskable` at 192 and 512.

## Theme and display

- `background_color` / `theme_color`: `#2a3439` (toolbox chrome; matches `index.html` `<meta name="theme-color">`)
- `display`: `standalone`
- `orientation`: `portrait`

## HTML head (`index.html`)

Besides the manifest link:

```html
<link rel="apple-touch-icon" href="%BASE_URL%icons/apple-touch-icon.png" />
<meta name="theme-color" content="#2a3439" />
```

Keep the existing SVG favicon link for browser tabs.

## After deploying manifest / scope fixes

Users who installed Macro Counter **before** a scoped manifest was live may still have a broken install cached:

1. Remove the old Macro Counter shortcut from the home screen (uninstall the PWA).
2. Open `https://maxmvs.com/macrocounter/` in the browser.
3. Install again from the browser menu.

Sister apps (`/workout/`, etc.) should then open in their own scoped installs.

## Verify

```bash
npm run icons
npm run build
```

Confirm under the build output (with `/macrocounter/` base):

- `manifest.webmanifest`
- `icons/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`

## Do not

- Set manifest `scope` or `start_url` to `/`
- Use only `favicon.svg` in the manifest `icons` list for Android (insufficient for maskable tiles)
- Add a service worker here unless the project already ships one (this repo does not)
