# Phoxta Startup School

A cohort programme for founders, built on the Coir Six school platform. Thirteen courses
from founder fit to the day you sell, a live classroom every week, and mentors attached to
each track.

It is a **duplicate of `businesses/coir-six`**, not a fork of its data: the two schools share
the `cs_*` tables and are separated by `organization_id`. Every one of those tables is
org-scoped, `cs_categories` is per-org, and `cs_courses.category_id` is plain `text` with no
check constraint — so a second school needed content and branding, not schema.

## The three tracks

The ten stages of the handbook journey map onto three tracks, because the UI is built around
exactly three categories (a three-card dashboard row, a three-column progress panel, three
colour tokens).

| Track | Colour | Stages | Courses |
|---|---|---|---|
| **Start** | blue | founder fit, opportunity, model & strategy, legal form, plan & pitch | 5 |
| **Fund** | purple | opening capital, growth capital, angels & venture | 3 |
| **Grow** | pink | selling, operating, measuring, scaling, harvest | 5 |

Thirteen courses · 27 modules · 58 lessons · 39 quiz questions · 6 live sessions · 5 groups.

## Where the curriculum comes from

`.claude/skills/entrepreneur-handbook` — HBR's *Entrepreneur's Handbook* distilled into
fourteen chapters and four appendices, plus thirteen researched 2026 supplements
(~146,000 words). The lesson bodies are written from its named frameworks: the three
must-haves, the ten market questions with a confidence and a test, Magretta's narrative and
numbers tests, the banker's three questions, the five lender ratios, the matching principle,
the four leadership modes.

**Lessons are written, not filmed, on purpose.** A founder school's video is its own recorded
cohort sessions — the classroom already records to storage and attaches the recording to the
session — so the catalogue carries the durable written method and the live timetable carries
the teaching. `Lesson.kind` still supports `video`, so a tenant can add one at any time.

## Editing the curriculum

`packages/core/src/seed.ts` is the single source. It is **both** the bundled demo catalogue
(what a visitor explores with no backend) **and** the seed for a live tenant, which is why
the two can never disagree.

```bash
npm run gen:migration     # regenerates supabase/migrations/0155_startup_school_seed.sql
```

Never hand-edit the SQL. It is generated from the TypeScript by `scripts/gen-migration.mjs`
so fifty-eight lesson bodies are not transcribed twice.

To populate a real school:

```sql
select ss_seed_org('<organization uuid>');
```

Idempotent — re-running refreshes the catalogue and leaves learner rows untouched. Wire it
into provisioning for the startup-school blueprint the way `cs_seed_org` is wired for
coir-six (see `0152_coir_six_live_schedule.sql`).

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
