# Phoxta Startup School

An applied programme for founders, built on the Coir Six school platform. The curriculum takes a founder through one connected journey: IDEA -> PROBLEM -> MARKET -> CUSTOMER -> BUSINESS MODEL -> BRAND -> MVP -> MARKETING -> LAUNCH -> GROWTH.

It is a duplicate of `businesses/coir-six`, not a fork of its data: the schools share `cs_*` tables but are separated by `organization_id`.

## The three tracks

| Track | Focus | Courses |
|---|---|---|
| **Validate** | opportunity, market research, business model | 3 |
| **Build** | brand, MVP, startup finance | 3 |
| **Launch & Grow** | marketing, sales, launch, growth | 4 |

10 outcome-led courses / 106 applied topic lessons / 10 final assessments / 646 structured learning blocks / 50 checkpoint questions.

## Where the curriculum comes from

The programme is written for Phoxta Startup School as an applied founder journey. Every topic includes a learning objective, an explanation, a practical activity, an AI reflection prompt and a reusable template. Each course ends in a business asset: an Opportunity Brief, Market Validation Report, Business Model Canvas, Brand Strategy Document, MVP Blueprint, 90-Day Marketing Plan, Customer Acquisition System, 12-Month Financial Model, Launch Plan or Growth Strategy.

## Editing the curriculum

`packages/core/src/curriculum.ts` is the single source for the 10-course catalogue. It derives the demo rows, structured lesson blocks and final assessments. `packages/core/src/seed.ts` supplies the surrounding school demo data and re-exports the curriculum for migration generation.

```bash
npm run gen:migration     # regenerates supabase/migrations/0155_startup_school_seed.sql
```

The checked-in `0158_startup_school_final_curriculum.sql` applies the replacement curriculum to already provisioned Startup School tenants. Both migrations are idempotent: re-running `ss_seed_org` refreshes the catalogue while preserving learner records.

## Commands

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # tsc --noEmit && vite build
npm run lint
npm run typecheck:core
npm run gen:migration
npm run mobile           # the Expo app in apps/mobile
```

## How it hangs together

Unchanged from Coir Six, and documented there in more depth:

- **One deployment serves every tenant.** `resolveTenant` reads the org from the request
  host through `app_resolve_domain`, or from a baked `VITE_ORG_ID` for a single-tenant build.
  No tenant is not an error — the app runs the bundled demo so a visitor never meets a blank
  screen.
- **`Repo` is the only data seam.** `LocalRepo` (demo, in this browser) and `SupabaseRepo`
  (a signed-in founder under RLS) behind one interface; pages never know which.
- **`LiveRoom` is the only A/V seam**, with three implementations — `LivekitRoom` (real,
  self-hosted LiveKit), `PresenceRoom` (no media server configured), `DemoRoom` (scripted).
  The UI never imports `livekit-client`; it loads in its own lazy chunk.
- The `coir-live` and `coir-live-recap` edge functions are **shared** with Coir Six. They are
  org-agnostic — tenancy is proved from `cs_profiles` — so both schools mint tokens from the
  same place.

## What is deliberately not built

Carried over from Coir Six and still true here:

- **No course authoring.** The catalogue is seeded, not edited in-app. That is survivable for
  a school Phoxta runs itself with one curriculum; it is the first thing to build before
  selling this to anyone who must fill it themselves.
- **No payments.** There is no price on a course and no checkout. A paid cohort needs this.
- **No 1:1 booking.** Live sessions are a fixed timetable; mentors cannot publish
  availability and founders cannot claim a slot. Office hours currently work by turning up.

## Demo

"Explore the demo as Tobi" — a founder six weeks in: one course complete with a certificate,
four under way, a five-day streak, two mentor conversations and a live session in progress.
The in-progress session is deliberate, so the classroom is demonstrable at any hour.
