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

## Layout

```
src/
  lib/         supabase client, tenant resolution + branding, derive (all the numbers), format, icons
  data/        types · Repo interface · LocalRepo (demo) · SupabaseRepo (live) · seed (the starter school)
  state/       tenant · auth · data · toast providers
  components/  ui primitives, cards, charts, overlays, shell, player (YouTube + file + quiz + notes)
  pages/       dashboard · courses · course · lesson · live lessons · tasks · groups · inbox ·
               mentors · progress · certificate · notifications · settings · auth
public/images/ Pexels-licensed photography (CREDITS.md)
```

The Postgres side is `supabase/migrations/0147_coir_six.sql` at the repo root,
plus `0149_coir_six_avatars.sql` for the photo bucket.

On desktop the shell pins two things: the sidebar (the wordmark never moves;
the nav under it scrolls on its own in a short window) and the toolbar
(search · inbox · notifications · you). Its height is `--cs-topbar-h` in
`src/index.css`; anything else that sticks (page rails) uses `--cs-rail-top`.
