<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fb862a6c-295f-479d-8108-4680523ce1d6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Distribution (maxmvs.com toolbox)

Macro Counter is deployed at **`/macrocounter/`** (Vite `base: '/macrocounter/'`) alongside sister apps on [maxmvs.com](https://maxmvs.com).

### PWA manifest and icons

- `public/manifest.webmanifest` scopes the install to **`/macrocounter/`** only. Without this, an old install can hijack the whole domain (e.g. `/workout/` opening Macro Counter).
- Launcher icons: run `npm run icons` after changing `public/icons/*.svg`; commit the generated PNGs under `public/icons/`.
- Details: [docs/ui-specs/UI_SPEC.md](docs/ui-specs/UI_SPEC.md) (§ PWA and Android icons).

**After deploying manifest/icon fixes:** users should **uninstall** the old home-screen Macro Counter app, then reinstall from `https://maxmvs.com/macrocounter/` so scope and maskable icons apply.
