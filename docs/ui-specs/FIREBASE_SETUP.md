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

Same as Workout Path A:

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
