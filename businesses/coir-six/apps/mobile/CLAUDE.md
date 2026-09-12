# CLAUDE.md — Coir Six mobile (Expo)

The iOS/Android app for Coir Six. Same Supabase project, tables, auth users
and photo bucket as the web app one folder up; the data layer is shared as
`@coir-six/core` (`../../packages/core`). Only screens live here.

## Stack
- **Expo SDK 57 · React Native 0.86 · React 19.2 · TypeScript 6 (strict)**, Expo Router (file routes under `src/app`), React Compiler on.
- Styling is a **theme hook + StyleSheet**, not NativeWind: `useTheme()` returns the design tokens (`@coir-six/core` `tokens`) with the school's brand mixed in. `Txt` is the only text component (typographic `role`, weight → font file).
- `expo-image` for remote images, `react-native-svg` + `lucide-react-native` for icons and the ring, `react-native-youtube-iframe` for lessons, `expo-image-picker` for the profile photo (native square crop), AsyncStorage for the session and the demo.

## Commands (run in this folder)
- `npx expo start` — dev server (press `a` Android, `i` iOS on a Mac, `w` web).
- `npx tsc --noEmit` — typecheck. `npx expo export --platform android|web` — bundle check without a device.
- Env: copy `.env.example` → `.env.local` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`; optional `EXPO_PUBLIC_ORG_ID` pins a white-label build to one school).

## How it hangs together
- `src/app/_layout.tsx`: providers (tenant → auth → data → toast) then one `Stack` with `Stack.Protected` groups: signed out → `(auth)`, signed in but not onboarded → `onboarding`, else `(tabs)` + pushed screens. Splash hides after fonts + auth + first load.
- `src/state/tenant.tsx`: one store app serves every school. The learner picks theirs by web address (`(auth)/school.tsx`, resolved through `app_resolve_domain`), remembered in AsyncStorage; a baked `EXPO_PUBLIC_ORG_ID` skips the picker. The tenant's brand themes the app.
- `src/state/data.tsx`: `SupabaseRepo(supabase, …)` for accounts, `LocalRepo(deviceStore)` for the demo (Jason) — identical to the web.
- Screens are thin: every number comes from `@coir-six/core` derive functions, every write goes through `mutate(repo => …)`.
- Web build (`expo export --platform web`) exists for previews/screenshots only; `YouTubePlayer.web.tsx` links out to YouTube because there is no WebView on web.

## Rules
1. Anything platform-neutral (types, queries, derived numbers) belongs in `packages/core`, not here — the web app must get it too.
2. Every tappable thing gets `accessibilityRole` + `accessibilityLabel`; images used as decoration are hidden from screen readers.
3. Bundled catalogue images are site-relative (`/images/…`); wrap with `mediaUrl(src, MEDIA_BASE)` (Avatar/Cover already do).
4. Save files as UTF-8 without BOM (see the repo root CLAUDE.md).
