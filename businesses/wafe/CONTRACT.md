# Wàfè — module contract

Wàfè is a modular monolith. Every product area is a **module**: a folder that owns
its types, seed, repos, pages and SQL, and plugs into the shell through one
manifest. Modules never edit shared files; the shell composes them from the
registry. This is what lets many people build modules in parallel without
stepping on each other, and what keeps a child's screen from ever reading a
parent's data.

Read `src/data/core.ts` and `src/lib/perms.ts` first — they are the vocabulary.

## Folder layout (one module = one folder, nothing outside it)

```
src/modules/<id>/
  module.ts          the manifest (default export: WafeModule<State, Repo>)
  types.ts           the module's entities + its State + its Repo interface
  seed.ts            demo data for the Adeyemi family (export function seed(ctx: SeedContext): State)
  local.ts           LocalRepo — demo in the browser (localStorage), built on seed()
  supabase.ts        SupabaseRepo — live rows under RLS (org + space scoped)
  derive.ts          every number the screens show, as pure functions of State
  pages/*.tsx        the screens (default exports), lazy-loaded from module.ts
  components/*.tsx   module-private components (optional)
  sql/<id>.sql       tables, policies, seed function for this module (see SQL section)
```

The id is one of: home · notifications · family · people · learning · books ·
bible · curricula · tasks · goals · projects · calendar · finance · travel ·
wardrobe · wellness · studio · moodboards · memories. Routes live under the area
path: `/grow/learning`, `/execute/tasks`, `/live/finance`, `/create/studio`,
`/family/people`, and `home` owns `/`.

## The manifest

```ts
// src/modules/tasks/module.ts
import { CheckSquare } from "lucide-react";
import type { WafeModule } from "@/data/core";
import type { TasksState, TasksRepo } from "./types";
import { LocalTasksRepo } from "./local";
import { SupabaseTasksRepo } from "./supabase";
import { dashboard, nudges, aiContext, search } from "./derive";

const tasks: WafeModule<TasksState, TasksRepo> = {
  id: "tasks", area: "execute", name: "Tasks & chores", blurb: "…", icon: CheckSquare,
  path: "/execute/tasks",
  visibleTo: ["tasks.manage", "tasks.assigned", "tasks.view"],
  routes: [
    { path: "", lazy: () => import("./pages/TasksPage") },
    { path: ":id", lazy: () => import("./pages/TaskPage") },
  ],
  createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseTasksRepo(ctx) : new LocalTasksRepo(ctx)),
  dashboard, nudges, aiContext, search,
};
export default tasks;
```

## State, repo and the hook

Each module declares `State` (everything its screens need for THIS member, already
filtered by visibility) and `Repo extends ModuleRepo<State>` with explicit write
methods. The shell loads the slice once and reloads it after every write:

```ts
const { state, repo, mutate, loading, error } = useModule(tasksModule);
await mutate((r) => r.completeTask(id));        // write, then the slice reloads
```

`useModule` is generic on the manifest, so `state` and `r` are fully typed.
Never keep a second copy of server state in component state; derive from `state`.

### LocalRepo (demo)

- Keyed in localStorage as `wafe:demo:<id>:v1`; on first load it stores `seed(ctx)`.
- Implements every write for real (the demo must work end to end), respecting
  `ctx.can(...)` exactly as the live repo would (throw `new Error("Not allowed")`).
- `load()` returns the state filtered for `ctx.me` — a child never receives a
  parent's private rows even in the demo. Put the filtering in one function in
  `derive.ts` (`visibleTo(state, ctx)`) and use it in BOTH repos.
- Use `uid()` from `@/lib/format` for new ids, `new Date().toISOString()` for times.

### SupabaseRepo (live)

- Tables are `wf_<entity>`; every row has `organization_id`, `space_id`, and
  where a row belongs to someone, `member_id` / `owner_member_id`, `visibility`
  and `shared_with uuid[]`.
- Filter every query by `space_id = ctx.space.id`; add `organization_id` on inserts.
- Map snake_case ↔ camelCase in this file only. Use `fail(where, error)` for errors.
- The client is `supabase` from `@/lib/supabase`.

## Seed — the Adeyemi family

`SeedContext` gives you the space, the members (`parents[0]` **Ifeoluwa** / Mum
(`mem-ife`, space owner, runs a brand consultancy, home-educates), `parents[1]`
**Oluwafemi** / Dad (`mem-tunde`, product manager, leads Bible study, organising
Christmas in Lagos), `kids[0]` **Dami** 15 (`mem-dami`, young-adult band, GCSEs,
own credentials, a granted budget envelope), `kids[1]` **Tobi** 9 (`mem-tobi`,
junior band, home-educated Year 5, science fair), `kids[2]` **Ayo** 5
(`mem-ayo`, little band, Reception, read-aloud), `guests[0]` **Mama Fọláké**
(`mem-folake`, grandmother in Ibadan — prayer wall, the Lagos trip, tagged
events) and `guests[1]` **Pastor Dayo** (`mem-dayo`, mentor — his sessions and
what is explicitly shared)), `today` (Sunday 6 Sep 2026), `at(days, "HH:MM")`,
`day(days)`, `uid(prefix)` and `img(name)`. Seed generously: the family must feel lived-in — a mix of done
and not-done, past and future, private and shared, at least one thing that needs
attention and one thing to celebrate, and content for the children. Dates are
RELATIVE to today so the demo never goes stale. Photos: fetch with
`node scripts/pexels.mjs "<query>" <name> <w> <h>` into `public/images` and
reference them as `ctx.img("<name>")`; never hot-link. Portraits already fetched: member-ife, member-tunde, member-dami, member-tobi, member-ayo, member-folake, member-dayo, plus family-hero, couple-home, home-living.

## Screens

- Use the primitives in `src/components/ui/*` (Button, Card, Field, Tag, Badge,
  Avatar, ProgressBar, Ring, BarChart, Dialog, Menu, EmptyState, Skeleton,
  SectionHead, SeeAll, Inset, Cover, Kbd) and the shared pieces in
  `src/components/shared.tsx` (PageTitle, AreaTag, MemberAvatar, MemberPicker,
  MemberChips, Money, DateText, VisibilityPicker, Confirm, EmptyModule).
- Tailwind v4 with the tokens in `src/index.css`: `bg-page`, `bg-card`, `text-ink`,
  `text-muted`, `text-caption`, `border-line`, `bg-brand`, `bg-execute-soft`,
  `text-live-ink`, `font-serif` for display headings, radius `rounded-xs/sm/md/lg/xl`.
- Every page starts with `<PageTitle title sub area />`. Lists get an EmptyState
  with a real call to action. Every destructive action goes through `Confirm`.
- Forms are real forms (`<form onSubmit>`), inputs labelled, errors inline.
- Mobile first: single column under `md`, two/three columns above. No horizontal
  page scroll. Tables scroll inside `overflow-x-auto`.
- Every `<img>` has `alt`, `width`, `height`, `loading="lazy"`.
- Role-aware: read `useSpace()` → `{ me, role, can, members, viewingAs }` and
  render only what `can()` allows; a child gets the simpler, warmer version
  (bigger type, fewer controls, points/badges where they apply).
- AI: `useAi()` → `ask(action, payload)`; show a loading state, an error state and
  the result inline; never block the screen on AI.

## Dashboard, nudges, AI grounding, search

Implement `dashboard(state, ctx)` (agenda for today, attention items, progress
rings, child cards), `nudges(state, ctx)` (follow-ups computed from state with
stable keys), `aiContext(state, ctx)` (≤1,500 chars, role-safe) and `search`.
These are what make the product one product rather than nineteen tabs.

## SQL (`sql/<id>.sql`)

- Tables `wf_<entity>` with: `id uuid primary key default gen_random_uuid()`,
  `organization_id uuid not null references organizations(id) on delete cascade`,
  `space_id uuid not null references wf_spaces(id) on delete cascade`,
  `created_at timestamptz not null default now()`, and where owned:
  `owner_member_id uuid references wf_members(id) on delete set null`,
  `visibility text not null default 'family' check (visibility in ('private','shared','family','child'))`,
  `shared_with uuid[] not null default '{}'`.
- Enable RLS and use the foundation helpers:
  `wf_is_member(space_id)`, `wf_is_parent(space_id)`, `wf_my_member(space_id)` (uuid),
  `wf_can_see(space_id, owner_member_id, visibility, shared_with)`.
  Standard policies:
  ```sql
  create policy wf_tasks_read  on wf_tasks for select to authenticated using (wf_can_see(space_id, owner_member_id, visibility, shared_with));
  create policy wf_tasks_write on wf_tasks for insert to authenticated with check (wf_is_member(space_id));
  create policy wf_tasks_edit  on wf_tasks for update to authenticated using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
  create policy wf_tasks_del   on wf_tasks for delete to authenticated using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
  ```
  Parent-only tables (finance, private notes): read/write `using (wf_is_parent(space_id))`.
- Pre-loaded content (Bible studies, curriculum templates, workout routines,
  verse packs) goes in `wf_catalog_<thing>` tables keyed by `organization_id`
  with a public-read policy, seeded by `create or replace function wf_seed_<id>(p_org uuid)` —
  idempotent (`on conflict do update`).
- Never reference another module's tables; join on ids in the app instead.

## Done means

- `npx tsc --noEmit` clean and `npx eslint src/modules/<id>` clean in `businesses/wafe`.
- Every acceptance criterion in the spec is met in the DEMO (it must be exercisable
  by clicking) and the live repo implements the same writes.
- `seed.ts` covers `demoData` from the spec.
- The manifest wires every page; deep links work on refresh.
