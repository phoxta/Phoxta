# Coir Six — an online-course platform

A learning platform for a school that sells courses online, and one of the
businesses sold on the Phoxta marketplace (blueprint slug `coir-six`, £2,500).
It began as a portfolio case study — a glance-first learner dashboard — and this
is that design built out as a real, multi-tenant application on the shared
Phoxta backend: video lessons, articles and quizzes, live sessions with
recordings, study groups, tasks, notes, an inbox, progress and certificates.

```bash
npm install
npm run dev        # http://localhost:3014
npm run build      # typecheck + production build
npm run lint
```

## Stack

Vite 6 · React 19 · TypeScript (strict) · react-router-dom 6 · Tailwind v4
(`src/index.css` holds the design tokens as `@theme` variables) ·
`@supabase/supabase-js` · lucide-react.

## Multi-tenant by host

One deployment serves **every** buyer of this blueprint. On boot it resolves
which school it is serving from the request hostname (`app_resolve_domain`), or
from a baked `VITE_ORG_ID` for a single-tenant deploy, then reads that school's
own catalogue and the signed-in learner's own rows. Every `cs_*` table carries
`organization_id`; every per-learner table is under row-level security keyed on
`user_id = auth.uid()`, so the anon key is safe in the bundle. See
`../CONTRACT.md`.

| | |
|---|---|
| Buyer hosts | `<tenant>.coir-six.phoxta.com` |
| Showcase | `demo.coir-six.phoxta.com` |
| Env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.local.example`) |

Vite inlines `VITE_*` at build time, so those must be set on the Vercel project
**before** the first production build.

## What a buyer gets

- **A working school on day one** — provisioning a business from this blueprint
  fires `cs_seed_org`, which copies the starter catalogue (3 tracks, 6 mentors,
  8 courses, 29 lessons with real public lectures, 15 quiz questions, 6 live
  sessions, 5 groups) into the new tenant under its own `organization_id`.
- **Learner accounts** — ordinary Supabase auth users; a learner's progress,
  notes, tasks, messages, quiz attempts and certificates are theirs alone.
- **Certificates are earned, not inserted** — `cs_issue_certificate` checks
  every lesson is complete server-side before it mints one.
- **Live classes that happen *in* the product** — a real classroom at
  `/room/:id` (spotlight + filmstrip, participants, chat, hands, reactions,
  host controls, recorder), not a link out to someone else's meeting. See
  below.
- **The demo** — "Explore as Jason" runs the same UI on a bundled copy of the
  catalogue, kept in the browser, so a prospect can use every screen without
  an account. It is also the fallback when a host isn't linked to a school.
- **Branding** — the tenant's saved brand (name, primary colour, font) is
  applied on boot (`src/lib/tenant.ts`): the wordmark, buttons, active nav and
  tints all follow it.
- **Profile photos** — a learner uploads a photo in Settings, drags/zooms it
  inside a round window (`components/ui/PhotoCropper.tsx`) and a 512px square
  JPEG is stored in the public `cs-avatars` bucket at
  `<org>/<user>/avatar-<ts>.jpg` (migration `0149`; policies let a learner
  write only inside their own folder). The demo keeps it as a data URL.

## Live classes

The headline feature of an online school. Before this, a "live lesson" was a row
in a timetable with a `join_url` pointing somewhere else — so the moment a class
started, Coir Six had nothing to do with it. Now the class, its roster, its chat,
its attendance and its recording all belong to the school.

**One screen, three transports.** The UI never imports a WebRTC SDK; it talks to
the `LiveRoom` interface in `packages/core/src/live/`, the same way pages talk to
`Repo` rather than to Supabase:

| | when | what you get |
|---|---|---|
| `LivekitRoom` | the school runs a media server | real audio/video, screen share |
| `PresenceRoom` | it doesn't | roster, chat, hands, attendance over Supabase Realtime, with the mentor's own stream on the stage |
| `DemoRoom` | "Explore as Jason" | a scripted class — classmates arrive, talk, put hands up |

`repo.openLiveRoom()` picks. A tenant that has not set up a media server gets a
working class page, never an error; `snapshot().media` tells the UI whether to
offer camera and microphone controls at all, so no button ever lies.

**A class has a stage.** The mentor starts on it; everyone else is audio-only
with `canPublish: false` *in the token grant*, so it is the media server that
refuses, not the page. Raising a hand asks to come up. That is both the right
classroom metaphor and the reason a 24-person class costs ~2 Mbps a learner
instead of saturating everyone's connection.

**Host actions are server-side.** Muting someone, changing their permissions,
removing them and ending the class are all calls a browser is not allowed to
make. They go through the `coir-live` edge function, which re-checks
`cs_is_live_host` before it acts.

```
packages/core/src/live/   room.ts (the contract) · baseRoom.ts (snapshot + emitter)
                          livekitRoom.ts · presenceRoom.ts · demoRoom.ts
src/components/live/      Lobby · RoomHeader · Tile · Rails · Controls · useRoom · useRecorder
src/pages/ClassroomPage   /room/:id — a sibling of AppShell, so the class is the whole screen
apps/mobile/src/app/room/ the same room on a phone
supabase/functions/coir-live/        token minting + the host actions
supabase/migrations/0150_coir_six_live.sql
```

`livekit-client` is behind a dynamic `import()`, so it lands in its own 586 kB
chunk and a learner who never opens a class never downloads a WebRTC SDK.

**The recorder** captures the host's own screen and microphone in their browser
(`MediaRecorder`) and uploads to the `cs-recordings` bucket, which fills in the
`recordingUrl` the "Watch recording" button already used. Server-side compositing
(LiveKit Egress) needs Redis and a headless Chrome per recording — more than the
shared Oracle box should carry. It swaps in behind `LiveRoom.setRecording`.

**To run it for real**, the school needs a media server. Ours is LiveKit
(Apache-2.0) on the Oracle Always Free VM that already hosts the voice bridge —
see `integrations/pipecat-voice/deploy/oracle/README.md`, "Live classes". Three
Supabase secrets switch it on: `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET`. Without them `coir-live` answers 501 and the app falls back
to `PresenceRoom`.

> **Expo Go no longer runs the mobile app.** WebRTC is a native module, so the
> phone build needs `npx expo run:android` / `run:ios` (a local dev build — no
> paid EAS subscription). The classroom degrades to avatars in Expo Go rather
> than crashing, so the other screens still work there.

## Layout

This folder is an npm workspace: the web app at the root, the shared data
layer in `packages/core`, the Expo app in `apps/mobile`. `npm install` here
installs all three.

```
packages/core/   @coir-six/core — types · Repo interface · LocalRepo (demo) · SupabaseRepo (live) ·
                 derive (all the numbers) · format · seed (the starter school) · tenant resolution ·
                 design tokens. No DOM, no React: both apps import it as source.
apps/mobile/     the iOS/Android app (Expo SDK 57, Expo Router). See its README.
src/             the web app:
  lib/           supabase client, tenant branding (DOM), cn
  data/          webStore (localStorage adapter for the shared LocalRepo)
  state/         tenant · auth · data · toast providers
  components/    ui primitives, cards, charts, overlays, shell, player (YouTube + file + quiz + notes)
  pages/         dashboard · courses · course · lesson · live lessons · tasks · groups · inbox ·
                 mentors · progress · certificate · notifications · settings · auth
public/images/   Pexels-licensed photography (CREDITS.md) — the app loads these by URL too
```

Vercel builds the web app from this folder as before (`npm run build`); the
workspace install pulls the mobile dependencies too, which only costs build time.

The Postgres side is `supabase/migrations/0147_coir_six.sql` at the repo root,
plus `0149_coir_six_avatars.sql` for the photo bucket.

On desktop the shell pins two things: the sidebar (the wordmark never moves;
the nav under it scrolls on its own in a short window) and the toolbar
(search · inbox · notifications · you). Its height is `--cs-topbar-h` in
`src/index.css`; anything else that sticks (page rails) uses `--cs-rail-top`.
