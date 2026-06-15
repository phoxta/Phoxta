# Supabase backend (fresh schema)

This is a clean, purpose-built backend for the Phoxta **platform** app (Vite SPA + Supabase).
Supabase (Postgres + Auth + RLS + Storage) is the backend; the app talks to it directly with
the public anon key and the signed-in user's session. Every table has Row-Level Security.

## Migrations (apply in order)
| File | What it creates |
|---|---|
| `0001_tenancy.sql` | `user_profiles`, `organizations`, `organization_memberships`; `updated_at` triggers; auto owner-membership; membership helper (`app_is_org_member`); RLS. |
| `0002_marketplace.sql` | `blueprints` (the marketplace catalog), `purchases`, `subscriptions`; RLS; **seeds the launch catalog** of live businesses. |
| `0003_matching.sql` | `match_profiles`, `matches` (founders / operators / investors); RLS. |

## Scope
- **In scope (platform/account):** tenancy + profile, marketplace, purchases, subscriptions, matching.
- **Out of scope (by design):** per-business operating data — stores, products, orders, website/CRM/etc.
  Each business a customer buys runs as its **own tenant with its own dashboard and backend**, so those
  tables are not modelled here.

## How the app maps to it
- `src/lib/supabaseClient.ts` — client-only Supabase (anon key, RLS).
- `src/lib/db/profile.ts` → `user_profiles` (column-compatible).
- `src/lib/db/organizations.ts` → `organizations` + `organization_memberships`.
- Marketplace / subscriptions / matching data layers are added as those screens are built.

## Applying to a new Supabase project
1. Create the project, then put its **public** values in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```
2. Run the migrations **in order** — paste each file into the Supabase SQL editor, or with the CLI:
   ```
   supabase link --project-ref <ref>
   supabase db push
   ```
3. In **Authentication → URL Configuration**, set Site URL + add redirect URLs
   (`http://localhost:5173` for dev, plus your production domain) so email confirm / reset links return here.

> Never put service-role or other server secrets in the Vite app — only `VITE_`-prefixed public values
> are safe (they are bundled into client JS).
