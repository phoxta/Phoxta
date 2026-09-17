# Wàfè — the operating system for intentional family life

One place for a family to **grow** together, **plan** together, **live** together
and **create** together. Wàfè connects what a family believes to what it actually
does on a Tuesday: values → vision → goals → milestones → today's tasks, with a
morning briefing, an evening check-in and Sunday planning holding the rhythm.

It is one of the businesses sold on the Phoxta marketplace (blueprint slug
`wafe`), and like the others it is multi-tenant: one deployment serves every
family that buys it.

```bash
npm install
npm run dev        # http://localhost:3015
npm run build      # typecheck + production build
npm run lint
```

The product definition lives in [`docs/DESIGN-BRIEF.md`](docs/DESIGN-BRIEF.md)
(the Design Brief & PRD) and [`docs/build-spec.json`](docs/build-spec.json) (the
same thing as data: entities, features, acceptance criteria, permissions and AI
hooks per module). [`docs/AI.md`](docs/AI.md) explains the companion.
[`CONTRACT.md`](CONTRACT.md) is how a module plugs in.

## Stack

Vite 6 · React 19 · TypeScript (strict) · react-router-dom 6 · Tailwind v4
(`src/index.css` holds the design tokens as `@theme` variables) ·
`@supabase/supabase-js` · lucide-react. Fraunces for display, DM Sans for
everything else, on warm paper and deep olive.

## Shape

A **modular monolith**. The shell owns the frame; every product area is a
module in `src/modules/<id>/` that owns its types, seed, repos, screens and SQL
and plugs in through one manifest:

```
Home      home · notifications
Grow      learning · books · bible · curricula
Execute   tasks · goals · projects · calendar
Live      finance · travel · wardrobe · wellness
Create    studio · moodboards · memories
Family    family · people
```

A module contributes to four shared surfaces, which is what makes nineteen
modules read as one product rather than nineteen tabs:

| Surface | What a module gives it |
|---|---|
| `dashboard(state, ctx)` | today's agenda, what needs attention, progress rings, child cards |
| `nudges(state, ctx)` | follow-ups the engine raises once per key, as notifications |
| `aiContext(state, ctx)` | a role-safe summary the companion is grounded in |
| `search(state, q)` | hits for the global search box |

## Roles and privacy

Three roles — **parent**, **child**, **guest** — with four child age bands
(Little 4–6, Junior 7–10, Teen 11–14, Young adult 15–17) that change layout,
copy, content filters and rewards. The rule the brief insists on: *a child never
sees something simply because they belong to the family.* Access follows role,
age and sensitivity, enforced in three places — the capability matrix in
`src/lib/perms.ts`, each repo's `load()` (which filters before data reaches a
screen), and row-level security in Postgres. A parent can widen one member's
access with an explicit grant; nothing widens automatically.

## Multi-tenant by host

One deployment serves **every** family that buys this blueprint. On boot the app
resolves which space it is serving from the request hostname
(`app_resolve_domain`), or from a baked `VITE_ORG_ID`, then reads that family's
own rows. Every `wf_*` table carries `organization_id` and `space_id`; the anon
key is safe in the bundle. See [`../CONTRACT.md`](../CONTRACT.md).

| | |
|---|---|
| Buyer hosts | `<tenant>.wafe.phoxta.com` |
| Showcase | `demo.wafe.phoxta.com` |
| Env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.local.example`) |

Vite inlines `VITE_*` at build time, so those must be set on the Vercel project
**before** the first production build.

## The demo

"Explore the demo" runs the whole app on a bundled family — the **Adeyemis** of
Croydon: Ifeoluwa and Oluwafemi, Dami (15), Tobi (9), Ayo (5), Mama Fọláké in Ibadan and
Pastor Dayo — kept in the browser, no account needed. A **view as** switcher
changes which of the seven you are, and the product changes with you: the parent
command centre, a nine-year-old's warm tile screen, a guest who can see the
prayer wall and the Christmas trip and nothing else. It is also the fallback
when a host isn't linked to a family.

## The companion

One AI surface, everywhere: the morning briefing, the evening reflection, a
lesson built from a video, a four-week course from a book, tasks broken out of a
goal, a meal plan inside the grocery budget, a packing list per traveller, an
outfit from the actual closet, a family song with chords, a storyboard. Each is
one call to the `wafe-ai` edge function with an `action`, grounded in a summary
each module writes for the asking member — so a child's companion simply does
not contain the budget. Metered against the tenant's monthly allowance.

## Layout

```
src/
  data/        core domain (space, members, roles, capabilities, module contract) + core repos + the demo family
  lib/         supabase client, tenant resolution + branding, permissions, AI client, formatting
  state/       tenant · auth · space · data · toast providers
  components/  ui primitives, shared pieces, brand marks, the shell, the companion drawer
  pages/       auth + onboarding, area overviews, search, 404
  modules/     one folder per product area (see CONTRACT.md)
sql/           00-foundation.sql + one fragment per module, assembled into
               ../../supabase/migrations/0148_wafe.sql
scripts/       pexels.mjs — fetch a licensed photo into public/images
```
