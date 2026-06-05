# Firebase setup (Macro Counter)

Same Firebase project as **Workout Tracker** (`maxmvs-toolbox`). Only `VITE_FIREBASE_APP_ID` differs.

## Step 8 — Local

1. Firebase Console → Project settings → **Macro Counter** web app → copy `appId`.
2. From repo root:

   ```bash
   node scripts/bootstrapFirebaseEnvFromWorkout.mjs
   ```

3. Edit `.env.local` → set `VITE_FIREBASE_APP_ID=` to the **Macro** app id (not Workout’s).
4. `npm run dev` → Settings → Account → sign in.
5. Publish Firestore rules including `macroSocial` — see Workout-AI `docs/ui-specs/FIREBASE_SOCIAL_RULES.md`.

**Cloud data:** `users/{uid}/macros/data`  
**Social streak (friends):** `users/{uid}/macroSocial/main` — consecutive days above/below **calorie goal**; cheat-day monthly allowance in settings is **not** used in streak math.

## Step 9 — Production

### Git push (Cloudflare Workers Builds)

Same token as Workout (`Workers Builds Configuration` → Edit). Uses **Macro** `.env.local` (especially `VITE_FIREBASE_APP_ID`).

```powershell
cd MacroCounter-AI
npx wrangler login
$env:CLOUDFLARE_API_TOKEN = "your-token"
npm run cf:push-build-env
```

Then Cloudflare → **macrocounter-ai** → **Deployments** → **Retry deployment**.

If the script says “No build triggers”, connect the Macro Git repo under **macrocounter-ai** → Settings → Build.

### PC deploy only

```bash
npx wrangler login
npx wrangler secret put GEMINI_API_KEY   # if not already set on Macro worker
npm run deploy
```

Requires `.env.local` with Macro `appId` on the machine that builds.

Test: https://maxmvs.com/macrocounter/ → Settings → Account.

## Cross-app

- Profile name: `users/{uid}/profile/main` (shared with Workout).
- Friends list: shared; add friends in either app.
- Workout shows workout presence; Macro shows calorie streak only.
